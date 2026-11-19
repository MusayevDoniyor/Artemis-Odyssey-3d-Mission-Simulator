import { launchRealGpuBrowser } from '../qa/helpers/gpu';
import path from 'path';
import fs from 'fs';

async function main() {
  const { browser, page } = await launchRealGpuBrowser();
  
  await page.evaluate(async () => {
    await window.__QA__?.jumpToScene('launch', {});
    await window.__QA__?.waitUntilIdle(5000);
  });
  await page.waitForTimeout(1000);

  // Check T-10 state (PRE_SIM / before launch commit)
  const t10State = await page.evaluate(() => {
    const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
    const lc = sm?.launchComplex;
    const caa = lc?.crewAccessArm;
    return {
      caaExists: !!caa,
      caaPartId: caa?.userData?.partId,
      rotationY: caa?.rotation?.y ?? null,
      launchSequence: sm?.lastState?.launch?.launchSequence,
      countdownSec: sm?.lastState?.launch?.countdownSec
    };
  });
  console.log('T-10 State:', JSON.stringify(t10State, null, 2));

  const screensDir = path.resolve('docs/qa/screens');
  if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });

  const t10Path = path.join(screensDir, 'launch_pad_caa_extended_t10.png');
  await page.screenshot({ path: t10Path });
  console.log('Saved T-10 screenshot to:', t10Path);

  // Trigger countdown to T-0 (launch commit)
  await page.evaluate(() => {
    const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
    if (sm?.lastState?.launch) {
      sm.lastState.launch.launchSequence = 'READY';
      sm.lastState.launch.countdownSec = 0;
    }
  });
  await page.waitForTimeout(500);

  const t0State = await page.evaluate(() => {
    const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
    const lc = sm?.launchComplex;
    const caa = lc?.crewAccessArm;
    return {
      rotationY: caa?.rotation?.y ?? null,
      launchSequence: sm?.lastState?.launch?.launchSequence,
      countdownSec: sm?.lastState?.launch?.countdownSec
    };
  });
  console.log('T-0 State:', JSON.stringify(t0State, null, 2));

  const t0Path = path.join(screensDir, 'launch_pad_caa_retracted_t0.png');
  await page.screenshot({ path: t0Path });
  console.log('Saved T-0 screenshot to:', t0Path);

  await browser.close();
}

main().catch(console.error);
