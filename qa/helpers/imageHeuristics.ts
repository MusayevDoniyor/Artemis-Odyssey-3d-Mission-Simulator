import fs from 'node:fs';
import { PNG } from 'pngjs';

export interface ImageHeuristicResult {
  passes: boolean;
  violations: string[];
  bladeStreakDetected: boolean;
  nanColorDetected: boolean;
  isBlackFrame: boolean;
  averageLuminance: number;
}

export function analyzeScreenshot(imageBuffer: Buffer): ImageHeuristicResult {
  const png = PNG.sync.read(imageBuffer);
  const { width, height, data } = png;

  const violations: string[] = [];
  let totalLuminance = 0;
  let nanMagentaCount = 0;

  // Track horizontal and vertical high-contrast runs for blade streak detection
  const rowBrightRuns = new Int32Array(height);
  const colBrightRuns = new Int32Array(width);

  for (let y = 0; y < height; y++) {
    let currentRun = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;

      // Pure magenta NaN glitch detector: R > 240, G < 15, B > 240
      if (r > 240 && g < 15 && b > 240) {
        nanMagentaCount++;
      }

      // Bright streak tracking (lum > 220)
      if (lum > 220) {
        currentRun++;
        colBrightRuns[x]++;
      } else {
        if (currentRun > rowBrightRuns[y]) rowBrightRuns[y] = currentRun;
        currentRun = 0;
      }
    }
    if (currentRun > rowBrightRuns[y]) rowBrightRuns[y] = currentRun;
  }

  const totalPixels = width * height;
  const averageLuminance = totalLuminance / totalPixels;

  // Heuristic 1: Almost-black frame check (average lum < 1.0)
  const isBlackFrame = averageLuminance < 1.0;
  if (isBlackFrame) {
    violations.push(`Almost black frame detected (average luminance: ${averageLuminance.toFixed(2)})`);
  }

  // Heuristic 2: NaN Magenta pixel detector (>100 pure magenta pixels)
  const nanColorDetected = nanMagentaCount > 100;
  if (nanColorDetected) {
    violations.push(`NaN magenta glitch pattern detected (${nanMagentaCount} pixels)`);
  }

  // Heuristic 3: Long thin blade-like streak detector (>25% width or height)
  let maxHorizontalStreak = 0;
  for (let y = 0; y < height; y++) {
    if (rowBrightRuns[y] > maxHorizontalStreak) maxHorizontalStreak = rowBrightRuns[y];
  }

  let maxVerticalStreak = 0;
  for (let x = 0; x < width; x++) {
    if (colBrightRuns[x] > maxVerticalStreak) maxVerticalStreak = colBrightRuns[x];
  }

  const bladeStreakDetected =
    maxHorizontalStreak > width * 0.40 || maxVerticalStreak > height * 0.40;

  if (bladeStreakDetected) {
    violations.push(
      `Long high-contrast blade-like streak detected (max horizontal run: ${maxHorizontalStreak}px, max vertical run: ${maxVerticalStreak}px)`
    );
  }

  return {
    passes: violations.length === 0,
    violations,
    bladeStreakDetected,
    nanColorDetected,
    isBlackFrame,
    averageLuminance: Number(averageLuminance.toFixed(2)),
  };
}
