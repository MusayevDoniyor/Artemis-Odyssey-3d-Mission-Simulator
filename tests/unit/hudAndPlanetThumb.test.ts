import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SPACE FLIGHT HUD & PHOTOREALISTIC PLANET THUMBNAIL VERIFICATION', async (t) => {
  const thumbsDir = path.resolve('public/assets/planets/thumbs');

  await t.test('1. All 12 authentic 3D planet thumbnails exist and have valid PNG headers', () => {
    const requiredBodies = [
      'sun',
      'mercury',
      'venus',
      'earth',
      'moon',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
      'ceres',
    ];

    for (const bodyId of requiredBodies) {
      const filePath = path.join(thumbsDir, `${bodyId}.png`);
      assert.ok(fs.existsSync(filePath), `Missing thumbnail for ${bodyId} at ${filePath}`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 5000, `${bodyId}.png is unexpectedly small (${stat.size} bytes)`);

      const buf = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);
      // PNG magic number: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      assert.equal(buf[0], 0x89);
      assert.equal(buf[1], 0x50); // P
      assert.equal(buf[2], 0x4e); // N
      assert.equal(buf[3], 0x47); // G
    }
  });

  await t.test('2. PlanetThumb.tsx renders photorealistic asset maps with zero cartoon CSS wire rings', () => {
    const src = fs.readFileSync(path.resolve('src/components/PlanetThumb.tsx'), 'utf-8');
    assert.ok(
      src.includes('/assets/planets/thumbs/'),
      'PlanetThumb.tsx must reference photorealistic thumbs in public/assets/planets/thumbs/'
    );
    assert.ok(
      !src.includes('border-amber-200/85'),
      'PlanetThumb.tsx must eliminate cartoon CSS border wire ring for Saturn'
    );
    assert.ok(
      !src.includes('border-cyan-200/80'),
      'PlanetThumb.tsx must eliminate cartoon CSS border wire ring for Uranus'
    );
  });

  await t.test('3. SpaceFlightHUD.tsx implements streamlined telemetry pill and collapsible planet strip', () => {
    const hudSrc = fs.readFileSync(path.resolve('src/components/SpaceFlightHUD.tsx'), 'utf-8');
    assert.ok(
      hudSrc.includes('toggle-planet-strip-btn'),
      'SpaceFlightHUD must provide toggle button for the 11-world solar strip'
    );
    assert.ok(
      hudSrc.includes('hud-telemetry-pill'),
      'SpaceFlightHUD must render compact high-tech telemetry pill'
    );
    assert.ok(
      hudSrc.includes('showPlanetsStrip || spaceCameraMode === "overview"'),
      '11-planet strip must only display when toggled or in Overview camera mode'
    );
    assert.ok(
      hudSrc.includes('setObjectiveCollapsed'),
      'Exploration objective card must support collapsing'
    );
  });
});
