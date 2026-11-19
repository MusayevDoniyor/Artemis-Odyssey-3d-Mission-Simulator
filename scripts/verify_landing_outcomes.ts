import { launchRealGpuBrowser } from '../qa/helpers/gpu';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Launching real GPU browser to verify Landing Outcome Scenes...');
  const { browser, page } = await launchRealGpuBrowser();

  const outDir = 'docs/qa/screens';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const landingStates = [
    {
      id: 'landing_touchdown_success',
      sceneId: 'landing',
      params: { state: 'touchdown' },
      screenshotName: 'landing_touchdown_success.png',
      expectedState: 'Nominal Soft Touchdown'
    },
    {
      id: 'landing_hard_touchdown',
      sceneId: 'landing',
      params: { state: 'hard_landing' },
      screenshotName: 'landing_hard_touchdown.png',
      expectedState: 'Hard Touchdown'
    },
    {
      id: 'landing_crash_debrief',
      sceneId: 'landing',
      params: { state: 'crash' },
      screenshotName: 'landing_crash_debrief.png',
      expectedState: 'Crash Event & Post-Flight Debrief'
    }
  ];

  const dumpedStates = [];

  for (const s of landingStates) {
    console.log(`\nTesting Scene: ${s.id} (${s.expectedState})...`);

    await page.evaluate(`(async () => {
      await window.__QA__?.jumpToScene('${s.sceneId}', ${JSON.stringify(s.params)});
      await window.__QA__?.waitUntilIdle(5000);
    })()`);
    await page.waitForTimeout(1500);

    const stateDump = (await page.evaluate(`(() => {
      const appContext = window.__QA_APP_CONTEXT__;
      const sim = appContext?.getSim ? appContext.getSim() : {};
      const sm = appContext?.getSceneManager?.();
      const renderer = sm?.renderer;
      const info = renderer ? {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles
      } : { calls: 0, triangles: 0 };

      // Get text content of visible HUD or debrief modal
      const bodyText = document.body.innerText || '';
      const hudLines = bodyText.split('\\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && (
          l.includes('TOUCHDOWN') ||
          l.includes('LAND') ||
          l.includes('CRASH') ||
          l.includes('DEBRIEF') ||
          l.includes('MISSION') ||
          l.includes('V_SINK') ||
          l.includes('TILT') ||
          l.includes('ALT') ||
          l.includes('SPEED') ||
          l.includes('m/s') ||
          l.includes('FAILED') ||
          l.includes('SUCCESS')
        ))
        .slice(0, 10);

      return {
        phase: sim.phase || '(unknown)',
        landingVerticalSpeedMs: sim.landing?.verticalSpeedMs ?? null,
        landingLanded: sim.landing?.landed ?? null,
        landingPitchDeg: sim.landing?.pitchDeg ?? null,
        crashFxActive: sim.crashFx?.active ?? false,
        crashFxKind: sim.crashFx?.kind ?? null,
        renderCalls: info.calls,
        renderTriangles: info.triangles,
        hudSummary: hudLines
      };
    })()`)) as any;

    const ssPath = path.join(outDir, s.screenshotName);
    await page.screenshot({ path: ssPath });
    console.log(`Saved screenshot: ${ssPath}`);

    console.log(`  - Phase:                  ${stateDump.phase}`);
    console.log(`  - Vertical Speed (V_sink):${stateDump.landingVerticalSpeedMs !== null ? stateDump.landingVerticalSpeedMs + ' m/s' : 'N/A'}`);
    console.log(`  - Pitch Angle (Tilt):     ${stateDump.landingPitchDeg !== null ? stateDump.landingPitchDeg + '°' : 'N/A'}`);
    console.log(`  - Landed Flag:            ${stateDump.landingLanded}`);
    console.log(`  - Crash FX Active:        ${stateDump.crashFxActive} (kind: ${stateDump.crashFxKind})`);
    console.log(`  - Render Calls:           ${stateDump.renderCalls}`);
    console.log(`  - Render Triangles:       ${stateDump.renderTriangles}`);
    console.log(`  - HUD / Modal Text:       ${stateDump.hudSummary.join(' | ')}`);

    dumpedStates.push({
      sceneId: s.id,
      expected: s.expectedState,
      dump: stateDump,
      screenshot: s.screenshotName
    });
  }

  fs.writeFileSync('docs/qa/landing_outcomes_dump.json', JSON.stringify(dumpedStates, null, 2));
  console.log('\nSaved docs/qa/landing_outcomes_dump.json');

  await browser.close();
}

main().catch(console.error);
