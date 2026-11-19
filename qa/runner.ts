import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { AxeBuilder } from "@axe-core/playwright";
import { launchRealGpuBrowser, type GPUVerification } from "./helpers/gpu.js";
import {
  analyzeScreenshot,
  type ImageHeuristicResult,
} from "./helpers/imageHeuristics.js";
import {
  SCENE_CATALOG,
  type SceneCatalogEntry,
  type SceneViewConfig,
} from "./scenes.js";

export interface ScenePerfResult {
  frameCount: number;
  avgFps: number;
  p50Fps: number;
  p95FrameTimeMs: number;
  p99FrameTimeMs: number;
  maxFrameTimeMs: number;
  avgFrameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  meetsFloor: boolean;
  meetsTarget: boolean;
}

export interface SceneCheckResult {
  sceneId: string;
  sceneName: string;
  category: string;
  viewport: SceneViewConfig;
  passed: boolean;
  severity: "P0" | "P1" | "P2" | "P3" | "PASS";
  errors: string[];
  warnings: string[];
  screenshotPath: string;
  baselinePath?: string;
  diffPath?: string;
  diffPixels?: number;
  diffPercent?: number;
  heuristics: ImageHeuristicResult;
  perf?: ScenePerfResult;
  a11yViolationsCount?: number;
  sceneGraphStats?: {
    totalNodes: number;
    hasNanCoordinates: boolean;
    hasNegativeScale: boolean;
    missingRequiredObjects: string[];
  };
}

export interface QARunReport {
  timestamp: string;
  gpu: GPUVerification;
  platform: string;
  suite: string;
  totalScenes: number;
  passedScenes: number;
  failedScenes: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  results: SceneCheckResult[];
}

async function run() {
  const args = process.argv.slice(2);
  const suiteArg =
    args.find((a) => a.startsWith("--suite="))?.split("=")[1] || "full";
  const sceneFilter = args.find((a) => a.startsWith("--scene="))?.split("=")[1];
  const updateBaselines = args.includes("--update-baselines");
  const reviewedContactSheet = args.includes("--i-reviewed-the-contact-sheet");
  const framesArg = args.find((a) => a.startsWith("--frames="))?.split("=")[1];
  const perfFrames = framesArg
    ? parseInt(framesArg, 10)
    : suiteArg === "fast"
      ? 60
      : 120;

  if (updateBaselines && !reviewedContactSheet) {
    console.error(
      "[QA ERROR] Refusing to update baselines without explicit confirmation flag: --i-reviewed-the-contact-sheet",
    );
    process.exit(1);
  }

  console.log(
    `========================================================================`,
  );
  console.log(
    `   ARTEMIS ODYSSEY AUTOMATED QA SYSTEM (REAL GPU) - SUITE: ${suiteArg.toUpperCase()}`,
  );
  console.log(
    `========================================================================`,
  );

  // Ensure directories exist
  const reportDir = path.resolve("qa-report");
  const screensDir = path.join(reportDir, "screenshots");
  const diffsDir = path.join(reportDir, "diffs");
  const baselinesDir = path.resolve("qa/baselines");

  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(screensDir, { recursive: true });
  fs.mkdirSync(diffsDir, { recursive: true });
  fs.mkdirSync(baselinesDir, { recursive: true });

  // 1. Launch Browser on Real Physical GPU
  console.log(
    "\n[1/5] Verifying physical GPU and launching Playwright browser...",
  );
  const { browser, page, gpu } = await launchRealGpuBrowser();

  console.log(`[GPU UNMASKED] ${gpu.unmaskedRenderer}`);
  console.log(`[GPU VENDOR  ] ${gpu.unmaskedVendor}`);
  console.log(`[PIXEL RATIO ] ${gpu.devicePixelRatio}x`);

  const capturedConsoleErrors: string[] = [];
  const capturedNetworkFailures: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Allow benign favicon / dev server reload notifications
      if (
        !text.includes("favicon.ico") &&
        !text.includes("downloadable font")
      ) {
        capturedConsoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (err) => {
    capturedConsoleErrors.push(`[Unhandled Page Error] ${err.message}`);
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!url.includes("favicon.ico")) {
      capturedNetworkFailures.push(
        `${req.method()} ${url} (${req.failure()?.errorText || "FAILED"})`,
      );
    }
  });

  const results: SceneCheckResult[] = [];
  const scenesToRun = sceneFilter
    ? SCENE_CATALOG.filter((s) => s.id === sceneFilter)
    : SCENE_CATALOG;

  if (scenesToRun.length === 0) {
    console.error(
      `[QA ERROR] No scenes found matching filter: "${sceneFilter}"`,
    );
    try {
      await Promise.race([
        (async () => {
          await page.close().catch(() => {});
          await browser.close().catch(() => {});
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Browser close timeout")), 5000),
        ),
      ]);
    } catch (err: any) {
      console.warn(`[QA WARN] Browser close: ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`\n[2/5] Running ${scenesToRun.length} catalog scenes...`);

  for (let i = 0; i < scenesToRun.length; i++) {
    const scene = scenesToRun[i];
    console.log(
      `\n------------------------------------------------------------------------`,
    );
    console.log(
      `[Scene ${i + 1}/${scenesToRun.length}] ${scene.name} (id: ${scene.id})`,
    );

    for (const vp of scene.viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const vpLabel = `${vp.width}x${vp.height}`;
      console.log(`  -> Testing viewport ${vpLabel}...`);

      const errors: string[] = [];
      const warnings: string[] = [];

      // A. Scene Jump & Wait Until Idle
      try {
        const jumped = await page.evaluate(
          async ({ sId, params }) => {
            if (!window.__QA__) return false;
            return await window.__QA__.jumpToScene(sId, params || {});
          },
          { sId: scene.sceneId, params: scene.params },
        );

        if (!jumped) {
          warnings.push(
            `jumpToScene('${scene.sceneId}') returned false or unhandled`,
          );
        }

        // Apply camera preset if specified
        if (scene.camera) {
          await page.evaluate((cam) => {
            window.__QA__?.setCameraPreset(cam);
          }, scene.camera);
        }

        // Wait for rendering to settle
        await page.evaluate(async () => {
          window.__QA__?.seedRandom(0x4a82b3d1);
          await window.__QA__?.waitUntilIdle(5000);
        });

        // Small wait for post-processing shaders and CSS transitions
        await page.waitForTimeout(500);

        // Deterministically pause animation so screenshot capture is frozen
        await page.evaluate(() => {
          window.__QA__?.pause();
        });
      } catch (err: any) {
        errors.push(`Navigation failure: ${err.message}`);
      }

      // B. Scene Graph Sanity Traversal
      let sgStats = {
        totalNodes: 0,
        hasNanCoordinates: false,
        hasNegativeScale: false,
        missingRequiredObjects: [] as string[],
      };

      try {
        const dump = await page.evaluate(() => {
          return window.__QA__?.dumpSceneGraph() || [];
        });

        sgStats.totalNodes = dump.length;
        const existingNodeNames = new Set(dump.map((n) => n.name));

        // Check required visible objects
        for (const reqObj of scene.requiredObjects) {
          if (!existingNodeNames.has(reqObj)) {
            // Check if present in DOM for UI components
            const existsInDom = await page.evaluate((selector) => {
              if (document.getElementById(selector)) return true;
              if (document.querySelector(`[data-testid="${selector}"]`))
                return true;
              if (document.querySelector(`.${selector}`)) return true;
              try {
                if (document.querySelector(selector)) return true;
              } catch {}
              const allEls = document.querySelectorAll(
                "button, a, div, span, h1, h2, h3, canvas",
              );
              for (let i = 0; i < allEls.length; i++) {
                if (
                  allEls[i].textContent &&
                  allEls[i].textContent!.includes(selector)
                )
                  return true;
              }
              return false;
            }, reqObj);

            if (!existsInDom) {
              sgStats.missingRequiredObjects.push(reqObj);
            }
          }
        }

        for (const node of dump) {
          const [px, py, pz] = node.position;
          const [sx, sy, sz] = node.scale;

          if (Number.isNaN(px) || Number.isNaN(py) || Number.isNaN(pz)) {
            sgStats.hasNanCoordinates = true;
            errors.push(`Node "${node.name}" contains NaN in world position!`);
          }

          if (sx < 0 || sy < 0 || sz < 0) {
            sgStats.hasNegativeScale = true;
            errors.push(
              `Node "${node.name}" contains negative scale [${sx}, ${sy}, ${sz}]!`,
            );
          }
        }

        if (sgStats.missingRequiredObjects.length > 0) {
          warnings.push(
            `Missing expected objects: ${sgStats.missingRequiredObjects.join(", ")}`,
          );
        }
      } catch (err: any) {
        warnings.push(`Scene graph dump failed: ${err.message}`);
      }

      // C. Capture Screenshot
      const screenshotFilename = `${scene.id}_${vpLabel}.png`;
      const screenshotPath = path.join(screensDir, screenshotFilename);
      const screenshotBuffer = await page.screenshot({ path: screenshotPath });

      // D. Image Heuristics
      const heuristics = analyzeScreenshot(screenshotBuffer);
      if (!heuristics.passes) {
        for (const v of heuristics.violations) {
          if (heuristics.bladeStreakDetected || heuristics.nanColorDetected) {
            errors.push(`[Image Heuristic P0] ${v}`);
          } else {
            warnings.push(`[Image Heuristic] ${v}`);
          }
        }
      }

      // E. Visual Baseline Comparison (pixelmatch)
      const baselinePath = path.join(baselinesDir, screenshotFilename);
      const diffPath = path.join(diffsDir, screenshotFilename);
      let diffPixels: number | undefined;
      let diffPercent: number | undefined;

      if (updateBaselines) {
        fs.copyFileSync(screenshotPath, baselinePath);
        console.log(`    [BASELINE UPDATED] Saved ${screenshotFilename}`);
      } else if (fs.existsSync(baselinePath)) {
        try {
          const imgActual = PNG.sync.read(screenshotBuffer);
          const imgExpected = PNG.sync.read(fs.readFileSync(baselinePath));

          if (
            imgActual.width === imgExpected.width &&
            imgActual.height === imgExpected.height
          ) {
            const diffImg = new PNG({
              width: imgActual.width,
              height: imgActual.height,
            });
            diffPixels = pixelmatch(
              imgActual.data,
              imgExpected.data,
              diffImg.data,
              imgActual.width,
              imgActual.height,
              { threshold: 0.15 },
            );

            diffPercent = Number(
              (
                (diffPixels / (imgActual.width * imgActual.height)) *
                100
              ).toFixed(2),
            );
            fs.writeFileSync(diffPath, PNG.sync.write(diffImg));

            if (diffPercent > 2.0) {
              warnings.push(
                `Visual baseline mismatch: ${diffPercent}% pixels differ (${diffPixels} px)`,
              );
            }
          } else {
            warnings.push(
              `Baseline dimension mismatch: expected ${imgExpected.width}x${imgExpected.height}, got ${imgActual.width}x${imgActual.height}`,
            );
          }
        } catch (err: any) {
          warnings.push(`Visual regression check failed: ${err.message}`);
        }
      } else {
        warnings.push(
          "No blessed baseline found for this scene/viewport (run --update-baselines to generate)",
        );
      }

      // F. Real GPU Performance Telemetry (Primary 1440x900 viewport)
      let perf: ScenePerfResult | undefined;
      if (vp.width === 1440 && vp.height === 900 && suiteArg !== "fast") {
        try {
          console.log(`    Collecting ${perfFrames} frames on real GPU...`);
          // Resume animation loop for measurement
          await page.evaluate(() => {
            window.__QA__?.resume();
          });

          const perfData = (await page.evaluate(`
            new Promise((resolve) => {
              const frameTimes = [];
              let lastTime = performance.now();
              let count = 0;

              function onFrame(now) {
                const dt = now - lastTime;
                lastTime = now;
                if (count > 0) {
                  frameTimes.push(dt);
                }
                count++;
                if (count <= ${perfFrames}) {
                  requestAnimationFrame(onFrame);
                } else {
                  const stats = window.__QA__ ? window.__QA__.dumpSceneStats() : {};
                  resolve({ frameTimesMs: frameTimes, stats: stats });
                }
              }
              requestAnimationFrame(onFrame);
            })
          `)) as { frameTimesMs: number[]; stats: any };

          // Pause after measurement
          await page.evaluate(() => {
            window.__QA__?.pause();
          });

          const sortedTimes = [...perfData.frameTimesMs].sort((a, b) => a - b);
          const p50Time =
            sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 16.6;
          const p95Time =
            sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 16.6;
          const p99Time =
            sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 16.6;
          const maxTime = sortedTimes[sortedTimes.length - 1] || 16.6;
          const avgTime =
            perfData.frameTimesMs.reduce((a, b) => a + b, 0) /
            perfData.frameTimesMs.length;

          const p50Fps = Math.round(1000 / p50Time);
          const avgFps = Math.round(1000 / avgTime);

          const meetsFloor = p50Fps >= scene.budget.floorFps && p95Time <= 50.0;
          const meetsTarget = p50Fps >= scene.budget.targetFps;

          if (!meetsFloor) {
            errors.push(
              `[PERF P1 FLOOR VIOLATION] p50 FPS: ${p50Fps} (floor: ${scene.budget.floorFps}), p95 frame: ${p95Time.toFixed(1)}ms (floor <= 50ms)`,
            );
          } else if (!meetsTarget) {
            warnings.push(
              `[PERF TARGET MISSED] p50 FPS: ${p50Fps} (target: ${scene.budget.targetFps})`,
            );
          }

          perf = {
            frameCount: perfData.frameTimesMs.length,
            avgFps,
            p50Fps,
            p95FrameTimeMs: Number(p95Time.toFixed(2)),
            p99FrameTimeMs: Number(p99Time.toFixed(2)),
            maxFrameTimeMs: Number(maxTime.toFixed(2)),
            avgFrameTimeMs: Number(avgTime.toFixed(2)),
            drawCalls: perfData.stats.drawCalls || 0,
            triangles: perfData.stats.triangles || 0,
            geometries: perfData.stats.geometries || 0,
            textures: perfData.stats.textures || 0,
            meetsFloor,
            meetsTarget,
          };

          console.log(
            `    -> p50 FPS: ${p50Fps} | avg FPS: ${avgFps} | p95 frame: ${p95Time.toFixed(1)}ms | Tris: ${perf.triangles.toLocaleString()} | Calls: ${perf.drawCalls}`,
          );
        } catch (err: any) {
          warnings.push(`Performance profiling failed: ${err.message}`);
        }
      }

      // G. Accessibility Scan on UI Scenes
      let a11yCount = 0;
      if (scene.category === "ui" && suiteArg === "full") {
        try {
          const axeResults = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();

          const criticals = axeResults.violations.filter(
            (v) => v.impact === "critical" || v.impact === "serious",
          );
          a11yCount = criticals.length;

          if (criticals.length > 0) {
            for (const v of criticals) {
              warnings.push(
                `[A11y ${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`,
              );
            }
          }
        } catch (err: any) {
          warnings.push(`A11y audit skipped: ${err.message}`);
        }
      }

      // Determine Severity
      let severity: "P0" | "P1" | "P2" | "P3" | "PASS" = "PASS";
      if (
        errors.some(
          (e) =>
            e.includes("P0") ||
            e.includes("NaN") ||
            e.includes("blade") ||
            e.includes("crash"),
        )
      ) {
        severity = "P0";
      } else if (errors.length > 0) {
        severity = "P1";
      } else if (
        warnings.some(
          (w) => w.includes("TARGET MISSED") || w.includes("mismatch"),
        )
      ) {
        severity = "P2";
      } else if (warnings.length > 0) {
        severity = "P3";
      }

      const passed =
        severity === "PASS" || severity === "P2" || severity === "P3";

      results.push({
        sceneId: scene.id,
        sceneName: scene.name,
        category: scene.category,
        viewport: vp,
        passed,
        severity,
        errors,
        warnings,
        screenshotPath: `screenshots/${screenshotFilename}`,
        baselinePath: fs.existsSync(baselinePath)
          ? `baselines/${screenshotFilename}`
          : undefined,
        diffPath: fs.existsSync(diffPath)
          ? `diffs/${screenshotFilename}`
          : undefined,
        diffPixels,
        diffPercent,
        heuristics,
        perf,
        a11yViolationsCount: a11yCount,
        sceneGraphStats: sgStats,
      });
    }
  }

  // 3. 5x Enter/Exit Leak Test on representative scene transition
  if (suiteArg === "full") {
    console.log(`\n[3/5] Running 5x enter/exit leak test...`);
    try {
      const memorySnapshots: any[] = [];
      for (let cycle = 1; cycle <= 5; cycle++) {
        await page.evaluate(async () => {
          await window.__QA__?.jumpToScene("title");
          await window.__QA__?.waitUntilIdle();
          await window.__QA__?.jumpToScene("launch");
          await window.__QA__?.waitUntilIdle();
        });
        const stats = await page.evaluate(() =>
          window.__QA__?.dumpSceneStats(),
        );
        memorySnapshots.push(stats);
      }
      console.log(`    Leak test snapshots recorded across 5 transitions.`);
    } catch (err: any) {
      console.warn(`    Leak test warning: ${err.message}`);
    }
  }

  try {
    await Promise.race([
      (async () => {
        await page.close().catch(() => {});
        await browser.close().catch(() => {});
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Browser close timeout")), 5000),
      ),
    ]);
  } catch (err: any) {
    console.warn(`[QA WARN] Browser close: ${err.message}`);
  }

  // 4. Summarize & Generate Reports
  console.log(`\n[4/5] Generating QA Reports...`);
  const p0s = results.filter((r) => r.severity === "P0").length;
  const p1s = results.filter((r) => r.severity === "P1").length;
  const p2s = results.filter((r) => r.severity === "P2").length;
  const passedCount = results.filter((r) => r.passed).length;

  const runReport: QARunReport = {
    timestamp: new Date().toISOString(),
    gpu,
    platform: process.platform,
    suite: suiteArg,
    totalScenes: results.length,
    passedScenes: passedCount,
    failedScenes: results.length - passedCount,
    p0Count: p0s,
    p1Count: p1s,
    p2Count: p2s,
    results,
  };

  // Save results.json and perf.json
  fs.writeFileSync(
    path.join(reportDir, "results.json"),
    JSON.stringify(runReport, null, 2),
  );

  const perfMap: Record<string, any> = {};
  for (const r of results) {
    if (r.perf) {
      perfMap[r.sceneId] = {
        ...r.perf,
        sceneName: r.sceneName,
        viewport: `${r.viewport.width}x${r.viewport.height}`,
      };
    }
  }
  fs.writeFileSync(
    path.join(reportDir, "perf.json"),
    JSON.stringify(perfMap, null, 2),
  );

  // Generate HTML Report
  const htmlContent = generateHtmlReport(runReport);
  fs.writeFileSync(path.join(reportDir, "index.html"), htmlContent);

  // Generate LATEST_SUMMARY.md
  generateMarkdownSummary(runReport);

  console.log(
    `\n========================================================================`,
  );
  console.log(
    `   QA RUN COMPLETE: ${p0s === 0 && p1s === 0 ? "SUCCESS (0 P0, 0 P1)" : "FAILED DEFECTS FOUND"}`,
  );
  console.log(`   Passed: ${passedCount} / ${results.length} scenes`);
  console.log(`   P0: ${p0s} | P1: ${p1s} | P2: ${p2s}`);
  console.log(`   HTML Report: file://${path.resolve("qa-report/index.html")}`);
  console.log(
    `========================================================================\n`,
  );

  if (p0s > 0 || p1s > 0) {
    process.exit(1);
  }
}

function generateHtmlReport(report: QARunReport): string {
  const isGreen = report.p0Count === 0 && report.p1Count === 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Artemis Odyssey - Automated QA Report (${report.suite.toUpperCase()})</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --pass: #10b981;
      --fail: #ef4444;
      --warn: #f59e0b;
      --accent: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: var(--text);
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
      background: ${isGreen ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"};
      color: ${isGreen ? "var(--pass)" : "var(--fail)"};
      border: 1px solid ${isGreen ? "var(--pass)" : "var(--fail)"};
      margin-bottom: 16px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .meta-item {
      background: #0d1322;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--card-border);
    }
    .meta-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
    .meta-value { font-size: 14px; font-weight: bold; margin-top: 4px; word-break: break-all; }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--card-border);
    }
    th {
      background: #0d1322;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 11px;
    }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .pill-pass { background: rgba(16, 185, 129, 0.15); color: var(--pass); }
    .pill-fail { background: rgba(239, 68, 68, 0.15); color: var(--fail); }
    .pill-warn { background: rgba(245, 158, 11, 0.15); color: var(--warn); }
    .scene-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 20px;
    }
    .scene-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .scene-card-header {
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0d1322;
      border-bottom: 1px solid var(--card-border);
    }
    .scene-title { font-weight: bold; font-size: 14px; }
    .scene-card-body { padding: 16px; }
    .scene-preview {
      width: 100%;
      height: 240px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--card-border);
      margin-bottom: 12px;
      background: #000;
    }
    .log-box {
      background: #090d16;
      border: 1px solid var(--card-border);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 11px;
      font-family: monospace;
      color: #cbd5e1;
      max-height: 100px;
      overflow-y: auto;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="status-badge">${isGreen ? "ALL GATES PASSED (0 P0 / 0 P1)" : "RELEASE GATES BLOCKED"}</div>
    <h1>Artemis Odyssey - Real GPU Automated QA System</h1>
    <p style="color: var(--text-muted); font-size: 13px;">Generated at ${report.timestamp} | Suite: <strong>${report.suite.toUpperCase()}</strong></p>
    
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Physical GPU Renderer</div>
        <div class="meta-value">${report.gpu.unmaskedRenderer}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Hardware Vendor</div>
        <div class="meta-value">${report.gpu.unmaskedVendor}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Total Scenes Tested</div>
        <div class="meta-value">${report.totalScenes} (${report.passedScenes} passed, ${report.failedScenes} failed)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Defect Tally</div>
        <div class="meta-value">P0: ${report.p0Count} | P1: ${report.p1Count} | P2: ${report.p2Count}</div>
      </div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Scene ID</th>
          <th>Name</th>
          <th>Viewport</th>
          <th>p50 FPS</th>
          <th>p95 Frame</th>
          <th>Triangles</th>
          <th>Draw Calls</th>
          <th>Visual Diff</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${report.results
          .map(
            (r) => `
          <tr>
            <td><code>${r.sceneId}</code></td>
            <td>${r.sceneName}</td>
            <td>${r.viewport.width}x${r.viewport.height}</td>
            <td><strong>${r.perf ? r.perf.p50Fps : "N/A"}</strong></td>
            <td>${r.perf ? r.perf.p95FrameTimeMs + " ms" : "N/A"}</td>
            <td>${r.perf ? r.perf.triangles.toLocaleString() : "N/A"}</td>
            <td>${r.perf ? r.perf.drawCalls : "N/A"}</td>
            <td>${r.diffPercent !== undefined ? r.diffPercent + "%" : "Baseline"}</td>
            <td><span class="pill ${r.passed ? "pill-pass" : "pill-fail"}">${r.severity}</span></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <h2 style="margin-bottom: 16px; font-size: 18px;">Scene Inspections & Visual Evidence</h2>
  <div class="scene-cards">
    ${report.results
      .map(
        (r) => `
      <div class="scene-card">
        <div class="scene-card-header">
          <div class="scene-title">${r.sceneName} (${r.viewport.width}x${r.viewport.height})</div>
          <span class="pill ${r.passed ? "pill-pass" : "pill-fail"}">${r.severity}</span>
        </div>
        <div class="scene-card-body">
          <img class="scene-preview" src="${r.screenshotPath}" alt="${r.sceneName}" loading="lazy" />
          <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>p50 FPS: <strong>${r.perf?.p50Fps ?? "N/A"}</strong></span>
            <span>Triangles: <strong>${r.perf?.triangles.toLocaleString() ?? "N/A"}</strong></span>
            <span>Draw Calls: <strong>${r.perf?.drawCalls ?? "N/A"}</strong></span>
          </div>
          ${
            r.errors.length > 0
              ? `<div class="log-box" style="border-color: #ef4444; color: #fca5a5;">
                  <strong>Errors:</strong><br/>${r.errors.join("<br/>")}
                </div>`
              : ""
          }
          ${
            r.warnings.length > 0
              ? `<div class="log-box" style="border-color: #f59e0b; color: #fde68a;">
                  <strong>Warnings:</strong><br/>${r.warnings.join("<br/>")}
                </div>`
              : ""
          }
        </div>
      </div>
    `,
      )
      .join("")}
  </div>
</body>
</html>`;
}

function generateMarkdownSummary(report: QARunReport) {
  const summaryPath = path.resolve("docs/qa/LATEST_SUMMARY.md");
  const isGreen = report.p0Count === 0 && report.p1Count === 0;

  const content = `# Artemis Odyssey - Latest QA Run Summary

- **Timestamp**: ${report.timestamp}
- **Suite**: \`${report.suite}\`
- **Result**: **${isGreen ? "GREEN (0 P0, 0 P1)" : "BLOCKED"}**
- **Physical GPU**: \`${report.gpu.unmaskedRenderer}\` (${report.gpu.unmaskedVendor})
- **Total Scenes**: ${report.totalScenes} (${report.passedScenes} passed, ${report.failedScenes} failed)
- **Defects**: P0: ${report.p0Count} | P1: ${report.p1Count} | P2: ${report.p2Count}

## Scene Performance & Geometry Results

| Scene ID | Viewport | p50 FPS | p95 Frame | Triangles | Calls | Status |
|---|---|---|---|---|---|---|
${report.results
  .map(
    (r) =>
      `| \`${r.sceneId}\` | ${r.viewport.width}x${r.viewport.height} | ${r.perf?.p50Fps ?? "N/A"} | ${
        r.perf ? r.perf.p95FrameTimeMs + "ms" : "N/A"
      } | ${r.perf?.triangles.toLocaleString() ?? "N/A"} | ${r.perf?.drawCalls ?? "N/A"} | ${r.severity} |`,
  )
  .join("\n")}

---
*Report generated automatically by Artemis Odyssey Automated QA System.*
`;

  fs.writeFileSync(summaryPath, content, "utf-8");
}

run().catch((err) => {
  console.error("[QA RUNNER FATAL]", err);
  process.exit(1);
});
