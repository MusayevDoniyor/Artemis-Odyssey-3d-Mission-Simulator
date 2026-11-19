import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnomalyDecision,
  applyOutpostDecision,
  beginLaunchCountdown,
  createInitialCampaignCarryover,
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
  evaluateTouchdown,
  getLunarTerrainHeight,
  getSurfaceSlopeDeg,
  getSurfaceTerrainHeight,
  separateLaunchStage,
  stepLandingPhysics,
  stepLaunchPhysics,
  stepRoverPhysics,
  stepSpaceFlightPhysics,
} from './physics';
import { PAYLOADS, PHYSICS, SOLAR_TARGETS } from './constants';

test('SLS launch countdown waits at READY without auto-launch, ignites on player input, and stages at 45 km & 110 km', () => {
  let L = createInitialLaunchState();
  assert.equal(L.launchSequence, 'PRE_SIM');

  L = beginLaunchCountdown(L);
  assert.equal(L.launchSequence, 'COUNTDOWN');

  // Tick through 3s countdown (60 * 0.05s = 3.0s) even while forward is held: must pause at READY and NOT auto-launch
  for (let i = 0; i < 60; i++) {
    L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, 0.05);
  }
  assert.equal(L.launchSequence, 'READY');
  assert.equal(L.ignited, false);
  assert.equal(L.altitudeKm, 0);

  // Remain at READY without player input for another 1s: still must NOT auto-launch
  for (let i = 0; i < 20; i++) {
    L = stepLaunchPhysics(L, { forward: false, left: false, right: false, action: false }, 0.05);
  }
  assert.equal(L.launchSequence, 'READY');
  assert.equal(L.ignited, false);
  assert.equal(L.altitudeKm, 0);

  // Now player presses W / SPACE in READY state -> ignites & gradually accelerates
  for (let i = 0; i < 420; i++) {
    L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, 0.05);
    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
      assert.equal(L.srbSeparated, true);
      assert.equal(L.fuelPct, 100);
    }
    if (L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && !L.coreSeparated) {
      L = separateLaunchStage(L);
      assert.equal(L.coreSeparated, true);
    }
    assert.ok(L.altitudeKm >= 0, 'altitude should never be negative');
    assert.ok(!Number.isNaN(L.altitudeKm), 'altitude should never be NaN');
    if (L.orbitReached) break;
  }
  assert.equal(L.launchSequence, 'ASCENDING');
  assert.ok(L.netAccelMs2 > 0, 'net acceleration F_net/Mass should be positive during powered ascent');
  assert.equal(L.orbitReached, true, 'SLS should cleanly reach 165 km orbit');
});

test('Orbital Satellite deploys, unfolds solar wings, and locks telemetry in space without landing', () => {
  let space = createInitialSpaceFlightState('artemis-2');
  space.targetId = 'relay-orbit';
  assert.equal(space.targetId, 'relay-orbit');
  space.autoPilot = true;
  let resources = { power: 80, oxygen: 75, shield: 70 };

  // Fly with Auto-Pilot to HERMES Relay Orbit (at calibrated 0.28 u/s speed, 7.0u transit takes ~500 steps)
  for (let i = 0; i < 600; i++) {
    const out = stepSpaceFlightPhysics(
      space,
      resources,
      { forward: false, backward: false, left: false, right: false, boost: false, action: false },
      false,
      0.05
    );
    space = out.space;
    resources = out.resources;
    if (space.inSatDeployZone) break;
  }
  assert.equal(space.inSatDeployZone, true, 'Orion should reach HERMES Relay deployment orbit');

  // Hold action to deploy satellite, unfold wings, and lock laser link
  space.autoPilot = false;
  for (let i = 0; i < 120; i++) {
    const out = stepSpaceFlightPhysics(
      space,
      resources,
      { forward: false, backward: false, left: false, right: false, boost: false, action: true },
      true,
      0.05
    );
    space = out.space;
    resources = out.resources;
    if (space.orbitalSat.linkLocked) break;
  }

  assert.equal(space.orbitalSat.deployed, true);
  assert.equal(space.orbitalSat.solarDeployedPct, 100);
  assert.equal(space.orbitalSat.dishAlignedPct, 100);
  assert.equal(space.orbitalSat.linkLocked, true, 'Satellite should complete calibration in space');
  assert.ok(space.visitedTargets.includes('relay-orbit'));
});

test('Moon and Mars AUTOLAND both touch down softly and Mars ISRU bonus adds descent fuel', () => {
  assert.equal(evaluateTouchdown(1.8, 1.0, 4), 'perfect');
  assert.equal(evaluateTouchdown(3.5, 1.5, 6), 'hard');
  assert.equal(evaluateTouchdown(5.2, 1.5, 6), 'crash');

  let moonLander = createInitialLandingState(PAYLOADS['solar-panels'].massMultiplier, 'moon', 0);
  moonLander.guidanceMode = 'AUTOLAND';
  for (let i = 0; i < 1800; i++) {
    moonLander = stepLandingPhysics(
      moonLander,
      { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
      0.05,
      true
    );
    if (moonLander.landed) break;
  }
  assert.equal(moonLander.landed, true);
  assert.equal(moonLander.result, 'perfect');

  const marsBase = createInitialLandingState(1.2, 'mars', 0);
  let marsBoosted = createInitialLandingState(1.2, 'mars', 16);
  assert.ok(marsBoosted.fuelPct > marsBase.fuelPct, 'ISRU fuel bonus should increase starting Mars descent fuel');
  marsBoosted.guidanceMode = 'AUTOLAND';
  for (let i = 0; i < 2000; i++) {
    marsBoosted = stepLandingPhysics(
      marsBoosted,
      { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
      0.05,
      false
    );
    if (marsBoosted.landed) break;
  }
  assert.equal(marsBoosted.landed, true, 'Mars 0.38g Auto-Land must touch down cleanly');
  assert.equal(marsBoosted.result, 'perfect');

  // Heavy 1.4x MARE Shield Vest on Mars 0.38g must also land softly with AUTOLAND
  let marsHeavy = createInitialLandingState(PAYLOADS['heavy-shield'].massMultiplier, 'mars', 0);
  marsHeavy.guidanceMode = 'AUTOLAND';
  for (let i = 0; i < 2000; i++) {
    marsHeavy = stepLandingPhysics(
      marsHeavy,
      { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
      0.05,
      false
    );
    if (marsHeavy.landed) break;
  }
  assert.equal(marsHeavy.landed, true, 'Mars heavy 1.4x shield Auto-Land must touch down cleanly');
  assert.equal(marsHeavy.result, 'perfect');

  // Sticky pintle throttle: forward ignites >= 10% and holds without forward; throttleDown & cutoff work
  let manualLander = createInitialLandingState(PAYLOADS['heavy-shield'].massMultiplier, 'mars', 0);
  manualLander.guidanceMode = 'MANUAL';
  manualLander = stepLandingPhysics(
    manualLander,
    { forward: true, backward: false, left: false, right: false, action: false, tiltForward: false },
    0.05,
    false
  );
  assert.ok(manualLander.targetThrottle >= 0.1, 'Forward press ignites sticky pintle throttle');
  const heldThrottle = manualLander.targetThrottle;
  manualLander = stepLandingPhysics(
    manualLander,
    { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
    0.05,
    false
  );
  assert.equal(manualLander.targetThrottle, heldThrottle, 'Throttle holds steady when no keys held');
  manualLander = stepLandingPhysics(
    manualLander,
    { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false, throttleDown: true },
    0.05,
    false
  );
  assert.ok(manualLander.targetThrottle < heldThrottle, 'throttleDown reduces pintle throttle');
  manualLander = stepLandingPhysics(
    manualLander,
    { forward: false, backward: false, left: false, right: false, action: true, tiltForward: false },
    0.05,
    false
  );
  assert.ok(manualLander.throttle > 0.4, 'action flares instantaneous engine throttle toward 100%');
  manualLander = stepLandingPhysics(
    manualLander,
    { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false, cutoff: true },
    0.05,
    false
  );
  assert.equal(manualLander.targetThrottle, 0, 'cutoff commands engine shutdown (0%)');
});

test('Expanded Moon & Mars Rover conforms to terrain up to ±260m and tracks Mars dust/Walker gait', () => {
  assert.equal(getLunarTerrainHeight(0, 0), 0);
  assert.equal(getSurfaceTerrainHeight('mars', 0, 0), 0);

  let moonRover = createInitialRoverState(185, 0, 'moon');
  for (let i = 0; i < 80; i++) {
    moonRover = stepRoverPhysics(moonRover, { forward: false, backward: false, left: true, right: false }, [], 0.05);
  }
  // Drive outward past 200m -> must allow reaching > 205m up to 260m
  let outward = createInitialRoverState(200, 0, 'moon');
  outward.headingRad = Math.PI / 2;
  for (let i = 0; i < 60; i++) {
    outward = stepRoverPhysics(outward, { forward: true, backward: false, left: false, right: false }, [], 0.05);
  }
  assert.ok(outward.x > 206 && outward.x <= 260, 'Rover must traverse expanded ±260m corridors');

  let marsRover = createInitialRoverState(0, 0, 'mars');
  marsRover.driveMode = 'WALKER';
  for (let i = 0; i < 40; i++) {
    marsRover = stepRoverPhysics(
      marsRover,
      { forward: true, backward: false, left: false, right: false },
      [],
      0.05
    );
  }
  assert.ok(marsRover.walkPhase > 0);
  assert.ok(marsRover.dustAccumulationPct > 8, 'Driving across Mars dust increases panel dust');
});

test('Applied Knowledge anomaly decisions reward learned OSDR notes and regolith berm carryover reduces crew dose', () => {
  const baseCarryover = createInitialCampaignCarryover();
  const shieldedCarryover = { ...baseCarryover, regolithShieldLevel: 2 };
  const baseRes = { power: 80, oxygen: 75, shield: 60 };

  const unbermed = applyAnomalyDecision(baseRes, baseCarryover, 'anom-artemis2-spe', 'orient-water-wall');
  const bermed = applyAnomalyDecision(baseRes, shieldedCarryover, 'anom-artemis2-spe', 'orient-water-wall');
  assert.equal(unbermed.isOptimal, true);
  assert.ok(bermed.carryover.radiationDoseMsv < unbermed.carryover.radiationDoseMsv, 'Regolith berm carryover reduces flare dose');
  assert.ok(bermed.carryover.unlockedFieldNotes.includes('note-orion-water-shield'));

  const trade = applyOutpostDecision(baseRes, 'boost-shield');
  assert.ok(trade.resources.shield > baseRes.shield);
});

test('AUTOLAND lands softly on all 3 Moon and all 3 Mars zones even with heavy 1.4x payload', () => {
  const heavyMass = PAYLOADS['heavy-shield'].massMultiplier;
  for (const planet of ['moon', 'mars'] as const) {
    for (const zoneId of [0, 1, 2] as const) {
      let L = createInitialLandingState(heavyMass, planet, 0);
      L.targetZoneId = zoneId;
      L.guidanceMode = 'AUTOLAND';
      for (let i = 0; i < 2400; i++) {
        L = stepLandingPhysics(
          L,
          { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
          0.05,
          false
        );
        if (L.landed) break;
      }
      assert.equal(L.landed, true, `${planet} zone ${zoneId} should land before step limit`);
      assert.equal(L.result, 'perfect', `${planet} zone ${zoneId} with 1.4x payload should achieve perfect touchdown`);
      assert.ok(L.distToPad <= 8.5, `${planet} zone ${zoneId} should land near pad center (got ${L.distToPad.toFixed(2)}m)`);
    }
  }
});

test('RATE_ASSIST lateral damping, killDrift [B] braking, Contact Light autoCutoff, and getSurfaceSlopeDeg work accurately', () => {
  assert.equal(Math.round(getSurfaceSlopeDeg('moon', 0, 0) * 10) / 10, 0);
  assert.equal(Math.round(getSurfaceSlopeDeg('mars', 0, 0) * 10) / 10, 0);
  // Check sloped terrain away from pad flat circle (e.g. crater/ridge flank)
  const roughSlope = Math.max(
    getSurfaceSlopeDeg('moon', 120, -135),
    getSurfaceSlopeDeg('moon', -138, -100),
    getSurfaceSlopeDeg('mars', -135, -90)
  );
  assert.ok(roughSlope > 0.5, `Off-pad lunar/mars flank should have non-zero terrain slope (got ${roughSlope})`);

  // RATE_ASSIST damps horizontal velocity automatically when no lateral input is pressed
  let rateLander = createInitialLandingState(1.2, 'moon', 0);
  rateLander.guidanceMode = 'RATE_ASSIST';
  rateLander.vx = 6.0;
  rateLander.vz = -5.0;
  for (let i = 0; i < 40; i++) {
    rateLander = stepLandingPhysics(
      rateLander,
      { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
      0.05,
      false
    );
  }
  assert.ok(Math.hypot(rateLander.vx, rateLander.vz) < 2.2, 'RATE_ASSIST should damp lateral drift');

  // killDrift [B] rapidly cancels horizontal drift in MANUAL mode
  let manualDrift = createInitialLandingState(1.2, 'moon', 0);
  manualDrift.guidanceMode = 'MANUAL';
  manualDrift.vx = 8.0;
  manualDrift.vz = 6.0;
  for (let i = 0; i < 30; i++) {
    manualDrift = stepLandingPhysics(
      manualDrift,
      { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false, killDrift: true },
      0.05,
      false
    );
  }
  assert.ok(Math.hypot(manualDrift.vx, manualDrift.vz) < 1.2, 'killDrift [B] should rapidly cancel horizontal drift');

  // Contact Light Apollo autoCutoff shuts down throttle when contact probe touches <= 1.75m softly
  let contactLander = createInitialLandingState(1.0, 'moon', 0);
  contactLander.y = getSurfaceTerrainHeight('moon', 0, 0) + 1.4;
  contactLander.x = 0;
  contactLander.z = 0;
  contactLander.vx = 0.2;
  contactLander.vz = 0.2;
  contactLander.vy = -0.8;
  contactLander.throttle = 0.6;
  contactLander.targetThrottle = 0.6;
  contactLander.contactLight = true;
  contactLander.autoCutoff = true;
  contactLander = stepLandingPhysics(
    contactLander,
    { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
    0.05,
    false
  );
  assert.equal(contactLander.throttle, 0, 'Contact Light autoCutoff should zero throttle during soft touchdown');
  assert.equal(contactLander.targetThrottle, 0);
});

test('Space Autopilot enters zero-fuel-drain station-keeping after arriving at target', () => {
  for (const targetId of ['relay-orbit', 'moon', 'mars'] as const) {
    const t = SOLAR_TARGETS[targetId];
    let space = createInitialSpaceFlightState('artemis-2');
    space.targetId = targetId;
    space.autoPilot = true;
    space.shipX = t.x + 0.5;
    space.shipZ = t.z + 0.5;
    space.vx = 0.1;
    space.vz = 0.1;
    const startFuel = space.fuelPct;
    let res = { power: 80, oxygen: 80, shield: 80 };

    for (let i = 0; i < 60; i++) {
      const out = stepSpaceFlightPhysics(
        space,
        res,
        { forward: false, backward: false, left: false, right: false, boost: false, action: false },
        false,
        0.05
      );
      space = out.space;
      res = out.resources;
    }
    assert.equal(space.fuelPct, startFuel, `Space Autopilot should not burn fuel while station-keeping at ${targetId}`);
  }
});

test('Orion navBodyId autopilot navigates to outer worlds past ±95 bounds cleanly', () => {
  let space = createInitialSpaceFlightState('artemis-2');
  space.navBodyId = 'jupiter';
  space.autoPilot = true;
  let res = { power: 90, oxygen: 90, shield: 90 };

  for (let i = 0; i < 600; i++) {
    const out = stepSpaceFlightPhysics(
      space,
      res,
      { forward: false, backward: false, left: false, right: false, boost: true, action: false },
      false,
      0.05,
      0,
      'exploration'
    );
    space = out.space;
    res = out.resources;
  }

  assert.ok(
    Math.abs(space.shipX) > 35 || Math.abs(space.shipZ) > 35,
    'Orion should travel outward toward Jupiter past inner bounds'
  );
  assert.ok(
    space.statusText.includes('Jupiter'),
    `Expected Jupiter navigation status, got: ${space.statusText}`
  );
});

test('SECO-1 parking orbit holds 165 km without over-burning fuel, and RL10B-2 TLI raises apoapsis to escape', async () => {
  const { createInitialLeoTransferState, stepLeoTransfer } = await import('./sequences');
  let L = createInitialLaunchState();
  L = beginLaunchCountdown(L);
  for (let i = 0; i < 65; i++) {
    L = stepLaunchPhysics(L, { forward: false, left: false, right: false, action: false }, 0.05);
  }
  for (let i = 0; i < 450; i++) {
    L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, 0.05);
    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
    }
    if (L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && !L.coreSeparated) {
      L = separateLaunchStage(L);
    }
    if (L.orbitReached) break;
  }
  assert.equal(L.orbitReached, true);

  // Holding forward for 2 more seconds after SECO-1 orbital insertion must NOT burn propellant or shoot velocity skyward
  const fuelAtSeco = L.fuelPct;
  for (let i = 0; i < 40; i++) {
    L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, 0.05);
  }
  assert.equal(L.fuelPct, fuelAtSeco, 'SECO-1 must preserve upper-stage propellant for TLI');
  assert.equal(L.altitudeKm, PHYSICS.SLS_ORBIT_TARGET_KM);
  assert.ok(L.horizontalSpeedMs < 8100, `Parking orbit speed should hold ~7.8 km/s, got ${L.horizontalSpeedMs}`);

  // Fire RL10B-2 TLI burn: must burn fuel realistically and push Vis-Viva apoapsis & velocity to escape
  let leo = createInitialLeoTransferState(3150);
  leo = stepLeoTransfer(leo, 0.05, true, L.horizontalSpeedMs / 1000, {
    altitudeKm: L.altitudeKm,
    icpsFuelPct: L.fuelPct,
  });
  leo = { ...leo, tliBurnActive: true };
  for (let i = 0; i < 200; i++) {
    leo = stepLeoTransfer(leo, 0.05, true, undefined, {
      altitudeKm: L.altitudeKm,
      icpsFuelPct: L.fuelPct,
    });
    if (leo.readyForSpaceTransition) break;
  }
  assert.equal(leo.readyForSpaceTransition, true, 'RL10B-2 TLI burn should reach 100% escape');
  assert.ok((leo.fuelBurnedPct ?? 0) > 25, 'TLI burn should consume significant RL10 propellant');
  assert.ok(leo.orbitalVelocityKmS >= 10.8, `TLI velocity should exceed 10.8 km/s, got ${leo.orbitalVelocityKmS}`);
  assert.ok((leo.apoapsisKm ?? 0) >= 350000, 'TLI should raise apoapsis to Lunar/escape distance');
});

test('Deep space flight tracks dominant SOI gravity well and classifies Hyperbolic Escape above escape velocity', () => {
  let space = createInitialSpaceFlightState('artemis-2');
  // Seed strong departure velocity while inside Earth SOI
  space.vx = 0;
  space.vz = 14.0;
  let res = { power: 90, oxygen: 90, shield: 90 };

  const out = stepSpaceFlightPhysics(
    space,
    res,
    { forward: true, backward: false, left: false, right: false, boost: true, action: false },
    false,
    0.05,
    0,
    'exploration'
  );
  assert.equal(out.space.dominantBodyName, 'Earth', 'Orion starting near Earth should report Earth SOI');
  assert.ok(
    (out.space.escapeVelocityKmS ?? 0) > 0,
    'Escape velocity v_esc should be populated dynamically'
  );
  assert.equal(
    out.space.trajectoryRegime,
    'Hyperbolic Escape',
    `High-energy departure should classify as Hyperbolic Escape, got ${out.space.trajectoryRegime}`
  );
});

test('Launch physics is frame-rate independent (30 FPS, 60 FPS, 120 FPS) and holds on pad until TWR > 1.0', () => {
  const runForDuration = (fps: number, durationSec: number) => {
    let L = createInitialLaunchState();
    L = beginLaunchCountdown(L);
    // Complete 3s countdown
    for (let i = 0; i < 60; i++) {
      L = stepLaunchPhysics(L, { forward: false, left: false, right: false, action: false }, 0.05);
    }
    assert.equal(L.launchSequence, 'READY');
    assert.equal(L.phaseStage, 'ENGINE_IGNITION');

    const dt = 1 / fps;
    const steps = Math.round(durationSec * fps);
    for (let i = 0; i < steps; i++) {
      L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, dt);
    }
    return L;
  };

  // During initial 0.25s RS-25 engine ignition startup, TWR < 1.0 and rocket must remain clamped on pad (altitudeKm === 0)
  const earlyIgnition = runForDuration(120, 0.25);
  assert.equal(earlyIgnition.ignited, true);
  assert.equal(earlyIgnition.phaseStage, 'ENGINE_IGNITION');
  assert.ok(earlyIgnition.twr < 1.0, `Expected TWR < 1.0 during initial RS-25 spin-up, got ${earlyIgnition.twr}`);
  assert.equal(earlyIgnition.altitudeKm, 0, 'Hold-down bolts must keep rocket on pad while TWR <= 1.0');
  assert.equal(earlyIgnition.verticalSpeedMs, 0);

  // Compare 5.0 seconds of powered flight at 30 FPS, 60 FPS, and 120 FPS
  const l30 = runForDuration(30, 5.0);
  const l60 = runForDuration(60, 5.0);
  const l120 = runForDuration(120, 5.0);

  assert.ok(l60.altitudeKm > 0.1, `Rocket should have lifted off by t=5.0s, got ${l60.altitudeKm} km`);
  assert.equal(l30.altitudeKm, l60.altitudeKm, '30 FPS and 60 FPS altitudeKm must match identically');
  assert.equal(l60.altitudeKm, l120.altitudeKm, '60 FPS and 120 FPS altitudeKm must match identically');
  assert.equal(l30.verticalSpeedMs, l120.verticalSpeedMs, '30 FPS and 120 FPS verticalSpeedMs must match');
  assert.equal(l30.horizontalSpeedMs, l120.horizontalSpeedMs, '30 FPS and 120 FPS horizontalSpeedMs must match');
  assert.equal(l30.fuelPct, l120.fuelPct, '30 FPS and 120 FPS propellant consumption must match');
});

test('Launch ascent progresses monotonically without altitude stall and traverses key launch phases', () => {
  let L = createInitialLaunchState();
  const seenPhases = new Set<string>([L.phaseStage ?? '']);
  L = beginLaunchCountdown(L);
  if (L.phaseStage) seenPhases.add(L.phaseStage);
  for (let i = 0; i < 65; i++) {
    L = stepLaunchPhysics(L, { forward: false, left: false, right: false, action: false }, 0.05);
    if (L.phaseStage) seenPhases.add(L.phaseStage);
  }

  let prevAlt = 0;
  for (let i = 0; i < 420; i++) {
    L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, 0.05);
    if (L.phaseStage) seenPhases.add(L.phaseStage);

    assert.ok(
      L.altitudeKm >= prevAlt,
      `Altitude must climb monotonically without dipping (step ${i}: ${L.altitudeKm} < ${prevAlt})`
    );
    prevAlt = L.altitudeKm;

    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
      if (L.phaseStage) seenPhases.add(L.phaseStage);
    }
    if (L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && !L.coreSeparated) {
      L = separateLaunchStage(L);
      if (L.phaseStage) seenPhases.add(L.phaseStage);
    }
    if (L.orbitReached) break;
  }

  assert.equal(L.orbitReached, true);
  assert.ok(seenPhases.has('PRE_LAUNCH'));
  assert.ok(seenPhases.has('SYSTEM_CHECK'));
  assert.ok(seenPhases.has('ENGINE_IGNITION'));
  assert.ok(seenPhases.has('THRUST_BUILDUP'));
  assert.ok(seenPhases.has('LIFTOFF'));
  assert.ok(seenPhases.has('MAX_Q'));
  assert.ok(seenPhases.has('UPPER_STAGE_OPERATION'));
  assert.ok(seenPhases.has('ORBIT_CONFIRMATION'));
});



