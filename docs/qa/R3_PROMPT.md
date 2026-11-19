# R3: GEOMETRY CORRUPTION FIX, FULL AUTOMATED QA SYSTEM (REAL GPU), RECONCILIATION, AND GATED RELEASE TO MAIN

Place at `docs/qa/R3_PROMPT.md`. Branch: `overnight/world-and-models` (create `qa/r3` from it for the work). Work continuously. Use the run-control files from the earlier overnight prompt (`docs/overnight/PROGRESS.md`, `DECISIONS.md`, `BLOCKERS.md`, `LOG.md`, kill switch `docs/overnight/STOP`). Re-read this file and PROGRESS.md at the start of each phase.

---

## 0. AUTHORIZATION AND RAILS

My explicit authorization for this task (it overrides the earlier rule "never merge to main" and the constitution's "no commit/push without prompt" for this task only):
- Commit freely on `qa/r3` (Conventional Commits). Push branches and tags to `origin` if a remote exists; never force-push; never rewrite history; never `git reset --hard`; no `rm -rf` outside generated folders.
- Merge to `main` ONLY through the release procedure in PHASE 7, and ONLY if every release gate passes. If gates fail, do not merge; follow the "partial release" rule in PHASE 7.
- Decisions you would normally ask me: choose the recommended option, log it in DECISIONS.md, continue. Do not ask questions during the run.
- Still forbidden: secrets in git, files outside the workspace (except the NASA cache folder and downloads), editing global config/skills/rules, unvetted packages (well-known dev packages are fine: playwright, pixelmatch, pngjs, axe-core / @axe-core/playwright, sharp, @gltf-transform/*, meshoptimizer, vitest if needed; log each).
- Never claim something works unless you ran it, on a real GPU where visuals or performance are concerned (see section 2).
- No new features. Only: fix defects, build the QA system, finish the listed leftovers, release. Anything else goes to `docs/BACKLOG.md`.

Failure handling: if a task fails twice after honest debugging, commit the unfinished work to `wip/<task>`, return to the last green state by creating a branch from the last green tag (do not reset), log it in BLOCKERS.md, and continue with the next task. Tag after each phase: `r3-phase-N-green`.

Definitions of severity used everywhere:
- P0: crash, blank/black screen, visibly corrupted geometry, NaN or Infinity in simulation or transforms, teleporting objects, data loss, security issue, licence/legal violation.
- P1: scientific claim shown as fact that is wrong or unsourced, broken or dead control, console errors, 404s, WebGL errors or shader compile errors, median FPS under 30 on the real GPU, essential UI clipped or overflowing, hardcoded fake data presented as live.
- P2: visual polish, minor performance, inconsistent labels or units, small layout issues.
- P3: nits.
Release requires zero open P0 and zero open P1.

---

## 1. PHASE 1: FIND AND FIX THE GEOMETRY CORRUPTION (P0, do this first)

Symptom (screenshot from my real browser, Hardware Bay, SLS Block 1): large white and cream blade-like streaks crossing the screen from the left and from below, scattered white fragments and "0"-shaped shapes around the pad base, and a cream wedge hanging below the pad disk. The rocket itself looks good. Your earlier headless tests passed, so they were blind to this.

1.1 Build `tools/glb-doctor/` (Node script, reusable, with unit tests). For any GLB it must report, as JSON and a human summary: triangle and vertex counts per mesh; bounding box and diagonal in world units after applying node transforms; NaN/Infinity vertices; degenerate triangles (zero area); the maximum and 99th percentile triangle edge length relative to the bounding-box diagonal; the count of "needle" triangles (longest edge over a large multiple of the shortest altitude); duplicate or missing attributes (normals, UVs); node tree with names and scales; transforms with extreme or negative scale; texture sizes and formats; extensions used (Draco, Meshopt, KHR_mesh_quantization) and their quantization bits; compressed vs decoded size. Exit non-zero if thresholds are exceeded (thresholds configurable and documented, defaults: no NaN, no degenerate fraction above 0.1 percent, no edge longer than 60 percent of the bounding diagonal unless allow-listed with a reason).

1.2 Run it on every GLB in `public/assets` and on the NASA originals (in `assets-src/nasa-3d-cache` and `assets-src/`). Render each GLB ALONE in a minimal dev scene with wireframe, from three angles, on the real GPU. Identify exactly which file(s) cause the streaks. Do not guess: show evidence (screenshots with the offending triangles, the doctor report, and a diff against the source).

1.3 Establish the root cause. Check, in this order: Draco/Meshopt position quantization bits on large meshes; simplify settings (target error, lock border, sparse simplification) that collapse vertices across seams; prune/dedup/weld steps that merged or reordered vertices; scale applied twice when reparenting nodes into staging groups (compare world matrices before and after reparenting); instanced transforms or skinning; the pad/Mobile Launcher/VAB/ISS placement transforms; texture-space or normal-space artefacts mistaken for geometry. State the confirmed cause.

1.4 Fix: re-export with sufficient quantization (or use Meshopt without position quantization, or Draco with higher bits), conservative simplification with a measured error budget, or revert that file to a clean version. Keep the budgets (hero <= 75k tris, background <= 40k). Keep the procedural fallback until the GLB passes every test.

1.5 Regression proof: keep the corrupted GLB(s) in `tests/fixtures/corrupt/` and write tests proving the doctor FAILS them and passes the fixed files. Add a test that fails if any shipped GLB in `public/assets` violates the doctor thresholds.

Evidence: before/after screenshots of Hardware Bay (SLS), Launch Pad and Title at 1440x900 captured on the real GPU, and an honest description of what you see.

---

## 2. REAL-GPU TESTING (applies to every phase)

All visual and performance checks must run on my machine's real GPU, not software rendering. Headless Chromium usually falls back to SwiftShader; do not accept that.
- Use Playwright with the installed Chrome or Edge (channel "chrome" or "msedge"), headed or new headless, with GPU flags such as `--use-angle=d3d11`, `--ignore-gpu-blocklist`, `--enable-gpu-rasterization`. Try options until it works; do not assume.
- On every run, read the WebGL renderer string (WEBGL_debug_renderer_info UNMASKED_RENDERER_WEBGL and UNMASKED_VENDOR_WEBGL, plus `renderer.capabilities`) and write it into the report header and into every perf JSON. If it contains SwiftShader, llvmpipe, Microsoft Basic Render or "Software", mark ALL visual and performance results of that run as INVALID for those purposes and say so.
- Record: GPU name, driver version if available, browser and version, OS, viewport, devicePixelRatio, power mode (note if the laptop is on battery).
- If you truly cannot get a real GPU in automation, say so plainly, and produce the exact manual procedure for me (what to open, which keys, what numbers to send), and gate the release on my confirmation instead (see PHASE 7, "manual GPU confirmation").

---

## 3. PHASE 2: BUILD A REAL, REUSABLE QA SYSTEM

Goal: one command runs a broad, deterministic, evidence-producing check of the whole app and fails loudly on corruption, errors, wrong behaviour, slowness or missing credits. Commands (add to package.json):
- `npm run qa:fast`: unit tests, type check, GLB doctor, asset integrity, licence manifest, UI smoke (about 2 minutes).
- `npm run qa:full`: everything below on the real GPU (target under 25 minutes), with an HTML report.
- `npm run qa:gpu`: only the visual and performance suites.
- `npm run qa:update-baselines`: regenerate baseline images; refuses to run unless `--i-reviewed-the-contact-sheet` is passed; writes a changelog of which baselines changed and why.
Reports go to `qa-report/` (gitignored, except a short `docs/qa/LATEST_SUMMARY.md` committed after each full run), containing: `index.html` (summary table, per-scene cards, contact sheet, diffs, console logs), `results.json`, `perf.json`, screenshots, and videos or frame strips for animations.

2.1 Deterministic harness. Add a QA mode (`?qa=1`) available in dev and preview builds only, and verified to be absent from the production bundle (a test greps `dist/` for the hook names). It exposes `window.__QA__` with:
- seeded random number generator (override Math.random and any particle seed), fixed simulation timestep control (`step(n)`), pause/resume, "wait until idle" (all GLB, textures, audio decoded and no pending loads), scene jump (title, briefing, pause, pad countdown, liftoff at T+N, Max-Q, SRB separation, core separation, orbit insertion, orbit coast, TLI, cislunar coast, lunar SOI, solar system overview, each body focus, landing approach, touchdown, crash, rover surface Moon and Mars, hardware bay per vehicle and explosion level, guided tour steps, settings), camera presets (name to position/target/FOV), time warp setter, mission-state injection (for example "set vehicle to apoapsis X"), a function that dumps scene stats and a scene-graph summary.
- All visual captures use fixed seeds, paused animation, and settled camera so two runs of the same scene are identical within tolerance. Test the determinism itself: capture each scene twice and assert near-zero diff.

2.2 Scene catalog (a data file `qa/scenes.ts`). Cover at least the following, each at 1440x900, plus Title, Briefing, Pause, Settings and Hardware Bay at 1920x1080 and 390x844:
- Title (hero scene), Briefing (each unlocked tab), Pause menu (every tab), Settings (every panel), Credits.
- Launch pad: pre-launch wide, pre-launch close on Mobile Launcher, VAB distance view, T-10 crew access arm, T+0 ignition, T+5, Max-Q, SRB separation, core stage burn, ICPS, orbit insertion, from 4 camera angles each where relevant.
- Space flight: Earth parking orbit (three zoom levels), TLI burn, cislunar coast, lunar SOI entry, free-return pass, each warp level HUD state.
- Solar system: overview in both scale modes, focus on each of Sun, Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn (rings, shadow), Uranus, Neptune, Pluto, Ceres, asteroid belt, Bennu; orbit lines on/off; labels on/off; the Sun, Jupiter, Earth, Moon side-by-side comparison.
- Landing: approach, flare, touchdown success, hard landing, crash and debrief; plume and dust at three altitudes.
- Surface: Moon south pole and Mars Jezero, rover chase and cockpit camera, driving into small and large boulders, wheel contact on slopes, shadows at low sun.
- Hardware Bay: for EVERY vehicle and spacecraft in the list (SLS, TDRS, JWST, Voyager, LM-2 concept lander, VIPER-like rover, Saturn V, Falcon 9, ISS, any added later): assembled, exploded at 35 and 100 percent, each subsystem isolated, each part selected (panel visible), each guided tour step.
Every entry has: id, how to reach it through `__QA__`, camera(s), what must be visible (named objects), and expected stats ranges (triangles, draw calls).

2.3 Per-scene automated checks (all of these, for every catalog entry):
a) Console and network: zero console errors and warnings (allow-list with reason), zero 404 or failed requests, zero unhandled rejections, zero `gl.getError()` non-zero values after the frame, zero shader compile or link errors, zero "texture unit" or "context lost" messages.
b) Scene-graph sanity via traversal: no NaN or Infinity in any matrixWorld or position; no zero or negative scale unless allow-listed; every mesh has a material and non-empty geometry; no mesh whose bounding box is more than N times the expected size of its parent or outside the expected world region; no objects below terrain or floating above it by more than a tolerance (for surface scenes); no overlapping duplicate meshes at the same transform (accidental double-loading); every named object listed in the catalog entry exists.
c) Triangle sanity (screen-space and world-space): for visible meshes sample geometry and flag long thin needle triangles, and triangles whose projected area exceeds a percentage of the viewport with extreme aspect ratio. This is the detector that must have caught the SLS corruption: verify it by running it against the corrupted fixtures and showing it fires.
d) Image heuristics: detect long straight bright strips (connected components that are long, thin and high-contrast, spanning more than 25 percent of the image width or height); detect large unexpected solid-colour regions or an almost-black frame where objects should be; detect NaN-coloured pixels (pure magenta/black patterns) and flicker between consecutive frames beyond a tolerance.
e) Visual regression: compare to baseline images with pixelmatch (threshold and max-diff-percentage per scene, with masks for known-animated regions), produce diff images. Baselines start UNBLESSED; mark them BLESSED only after the agent has viewed every image and recorded a one-line honest description (what is shown, any defect) in `qa/baselines/REVIEW.md`; then I confirm later. A scene with an unresolved visible defect cannot be blessed.
f) Performance on the real GPU: 600 frames after warm-up; report average FPS, p50, p95, p99 frame time, worst frame, JS CPU ms per frame (update vs render submission), draw calls, triangles, geometries, textures, estimated GPU texture memory, JS heap; GPU time with EXT_disjoint_timer_query_webgl2 if available; count of long tasks over 50 ms and their stacks. Release floors: p50 >= 30 FPS and p95 frame time <= 50 ms on every scene; targets: p50 >= 60 FPS on Title, Pad, Orbit, Solar system and Hardware Bay, p50 >= 45 FPS on Landing and Rover. Report against both.
g) Memory and leaks: enter and leave each scene 5 times; heap, geometries, textures, materials, render targets, event listeners, audio nodes must plateau; fail on growth beyond a tolerance.
h) Accessibility and UI (screens with UI): axe-core scan with zero serious/critical violations (document exceptions), keyboard-only traversal (Tab and Shift+Tab reach every control, visible focus ring, Escape closes modals, focus returns), contrast of text >= 4.5:1 and UI boundaries >= 3:1, no horizontal overflow at 1440, 1920 and 390 widths, no truncated essential text, touch target sizes at 390 wide.
i) Dead-control crawl: for each UI screen click or activate every visible control and assert either a visible state change/navigation, or that it is explicitly disabled with a reason; flag silent no-ops.
j) Provenance and honesty checks: every number the UI presents as "real" must come from the central data module with a source string; test that every data-module entry has a source and date; test that labels required by policy exist (e.g. "Unofficial educational project, not affiliated with NASA", "distances compressed x24" when in educational scale, "fictional concept" on the concept lander, "procedural recreation" labels, STS audio disclosure, archived-vs-live data pill).

2.4 Simulation QA (no browser):
- Full-mission autopilot: liftoff -> SECO -> at least 2 coast orbits -> TLI -> lunar SOI -> free-return -> reentry interface, in ONE run; assert continuity of position and velocity at every handoff (state jump below a tolerance), no NaN, monotone mission time, energy and angular momentum conservation during coasting within tolerance, circular orbit stays circular, period equals the analytical value, SOI handoffs continuous.
- Landing: a grid of initial conditions (altitude, sink rate, drift, tilt, throttle) with expected outcomes (success, hard landing, crash); verify the reported impact speed and tilt equal the simulated values (no 0.0 readouts); fuzz test with random inputs for crashes and NaN; assert hover throttle matches the lander table.
- Rover: displacement equals speed times time at each speed setting (including scientific speed and time compression); collision registry covers every solid object class; the rover never ends inside a collider after N random drives; no falling through terrain; slope handling.
- Staging and emitters: exhaust emitter world positions at nozzle exits and directions opposite to thrust across gimbal range; separated stages stop emitting; no emitter from the wrong stage.
- Scale invariants: rendered radii ratios equal true volumetric mean radius ratios in BOTH scale modes; distance compression factor displayed equals the actual factor; orbit lines match the Keplerian elements.
Make these runnable as fast node tests (`npm test`), and keep the existing 141 tests.

2.5 Data and server QA: schema validation for every API route (DONKI, OSDR, JPL Horizons, any AI route) including failure and timeout paths and the cached/offline fallback; the UI status pill state must equal the real data state (live, archived, offline); rate-limit handling; no API key leaking to the client; `DEMO_KEY` usage documented.

2.6 Audio QA: the audio graph builds without errors after a user gesture; music files present or a documented silent fallback; no 404; buses and sliders change gain; peak level of each shipped audio file and of the mixed output stays below a limit (analyse with OfflineAudioContext or an ffmpeg-free decoder); no clipping; loop points do not click (zero-crossing or crossfade verified); the default level is safe for a classroom (rocket SFX attenuated as agreed).

2.7 Asset and licence integrity: every file referenced in code exists; every file in `public/` is referenced or allow-listed (fails on orphans); no tracked file over 5 MB unless allow-listed with a reason; GLB doctor passes for all; texture sizes within budget; every asset in `public/` and every font appears in `docs/CREDITS.md` with author, source URL and licence (a test parses both and fails on missing entries); music files are gitignored and the game runs without them; no copyrighted logo clipart; the NASA insignia is not used outside what the usage guidelines allow (quote the guideline sentence in CREDITS.md); the in-game credits screen exists and lists attribution required by CC-BY assets (Solar System Scope textures, any others); OFL fonts credited.

2.8 Build and bundle QA: `npm run build` warnings tracked; bundle composition report; budgets (initial JS, total transfer); production build served with `vite preview` and re-run the smoke and perf suites against it (visuals can differ between dev and production builds because of minification and tree shaking).

2.9 Cross-browser smoke: Chromium (Chrome and Edge) full suite; Firefox via Playwright smoke (loads, no console errors, renders non-blank, key scenes render). Record differences; do not block the release on Firefox-only P2 issues, but do on P0/P1.

2.10 Mobile/narrow viewport: at 390x844 the fallback screen loads with no overflow and states desktop is recommended.

2.11 Self-test of the QA system: prove it works by injecting known defects and showing it fails: (1) the corrupted GLB, (2) a NaN position, (3) a deliberately dead button, (4) a 404 asset, (5) a console error, (6) a missing credit entry, (7) a 40 percent FPS drop (artificial load). Each must turn the run red with a clear message. Commit these as `qa/selftest/` tests.

2.12 Docs: `docs/qa/README.md` explaining how to run each command, how to read the report, how to bless or update baselines, how to add a scene, and how to interpret GPU info.

---

## 4. PHASE 3: RUN QA, TRIAGE, FIX IN ROUNDS

3.1 Run `qa:full` on the real GPU. Write `docs/qa/FINDINGS.md`: every finding with id, severity (P0..P3), scene, evidence (screenshot, log, number), suspected cause, status.
3.2 Fix in rounds: P0 first, then P1, then P2 where cheap. After each round re-run the relevant suites. Keep a table of round number, findings fixed, findings added, open counts per severity. Continue until zero P0 and zero P1 are open, or a round makes no progress twice (then record the blocker and decide per the partial-release rule).
3.3 Do not "fix" findings by weakening a test or widening a tolerance without a documented, physically or visually justified reason in DECISIONS.md.
3.4 Check specifically (known risks from earlier reports): the SLS node split (6 nodes with orion_las combined) versus the inspector's separate parts (Orion crew capsule, European Service Module, Launch Abort System): split so every inspector part maps to a real node, or reduce the list honestly; SLS height (model 94.63 m vs inspector 98.3 m): explain or correct with a source; the Hardware Bay lists "Base Camp" (cut): remove it; label the LM-2 lander as a fictional educational concept in the title and info panel; verify every cited source in the part info panels (for example "NASA SLS Mission Planner's Guide (ESD 30000)", "Marshall SLS Fact Sheet"): open each, give exact title and URL, or change or remove the citation.

---

## 5. PHASE 4: RECONCILE EARLIER REPORTS (each answered with evidence: commit, file, test)

a) Music: two earlier commits integrated `title_theme.mp3` and `space_flight_theme.mp3`; the last report said "no licensed audio, procedural chords". Check git log and the code; restore the integration if it was lost and explain how it happened. Confirm both tracks play (title/menu and space flight), crossfade, respect autoplay policy, ducking and the settings slider; confirm silent fallback and no 404 if the files are missing (they are gitignored); write the README note on where to place the files. Record sources: Starostin track (Pixabay track 338203; quote the licence sentence that applies to hosted copies) and `main_page.mp3` (source unknown: list it in CREDITS as "source unverified, operator to supply" and flag it as a release note; do not guess).
b) Draw calls on the launch pad: earlier 277 -> 174 (Mobile Launcher and VAB), later 276 -> 238. Explain the discrepancy, check the Mobile Launcher/VAB integration is active, and publish one consistent table for all scenes. Realistic targets per scene instead of the blanket 45: set them from the measured data and record in the perf budget file used by the QA system.
c) Saturn V: the file already had 34,814 triangles before "decimation"; state what actually changed.
d) STEP 0 and STEP 1 evidence from the earlier R2 message, in one short table (item, DONE/NOT DONE, proof): rendered radii in both scale modes, Artemis II citations (title, URL, quoted sentence; "design value" label for unsourced values; the real Artemis II profile versus the game's Mission 1), remaining HERMES/relay logic removed, speed-cap explanation and proposal, HUD time-compression readout, console/network 404 check, nasa.gov URL quotes and the raw DONKI JSON saved at `docs/data/donki-FLR-2024-05-10.json`, COVERAGE_AUDIT.md updated, performance audit items (FPS and frame time on the REAL GPU this time, longtask/GC, React render counts, leak test, time to first interactive, bytes on first load, top 15 bundle modules, 10 largest textures, ranked top 10 lag risks with fixes).
e) VAB meatball mural: quote the exact sentence from the NASA usage guidelines or the cited regulation (URL and page title) that permits depicting it; if it is not clearly permitted, replace the mural and flag textures with plain ones.
f) ISS (A) 6.6k tris: show 3-angle close-ups and an honest judgement of detail; if too crude for the inspector, propose and apply a better option within budget.

---

## 6. PHASE 5: APPROVED LEFTOVERS (small, measured, one commit each)

- Code splitting: `React.lazy` / dynamic import for SpaceSceneManager, mission scenes, the inspector, the Draco decoder and heavy GLB/texture loaders. Target: initial JS under 500 kB (stretch: under 350 kB); report before/after for first load and time to first interactive. Verify with `vite preview` that every scene still loads and the QA suite passes against the production build.
- Shader and pipeline pre-warm: `renderer.compileAsync` (or equivalent) during loading screens to remove the long tasks at scene transitions; report long-task counts before and after.
- Ceres texture: reduce 4096x2048 to 2048x1024; check the same for other textures over budget (record each).
- Draw-call reduction with `InstancedMesh` and `mergeGeometries` on the launch pad (catwalks, fences, railings, blast deflector plates), boulders and scatter, waypoints, orbit rings, ribbons; report per-scene before/after and visual diffs (must stay identical within tolerance).
- Wire the Pluto, VAB and Mobile Launcher assets with proper credits (already added; verify).
Do not start any other new feature.

---

## 7. PHASE 6: PRE-RELEASE CLEANUP

7.1 Repository hygiene on `qa/r3`: make sure large screenshots and generated artifacts are not tracked (only small WebP thumbnails and the contact sheet under a size limit); `qa-report/`, `assets-src/`, `public/assets/audio/music/`, `.env`, caches are gitignored; no tracked file over 5 MB unless allow-listed; secrets scan (grep for key patterns, `.env`, tokens); run `git count-objects -vH` and report repo size.
7.2 README: how to run the game, install, test, run QA, where to put the music files, licences and credits summary, the "unofficial educational project, not affiliated with NASA" notice. CHANGELOG with a human-readable summary of what changed since the original hackathon version.
7.3 `docs/RELEASE_NOTES_rc1.md`: what works, what is known broken (P2/P3 list), what is unverified, what needs my manual confirmation (see below).

---

## 8. PHASE 7: GATED RELEASE TO MAIN

Release gates (all must pass on the final commit of `qa/r3`, evidence recorded in `docs/qa/RELEASE_GATES.md` with command output and the GPU header):
G1: `tsc --noEmit`, `npm test`, `npm run build` all pass.
G2: `qa:full` on a REAL GPU: zero open P0, zero open P1; the report shows the GPU name (not software).
G3: performance floors met on every scene (p50 >= 30 FPS, p95 frame <= 50 ms); the targets that were missed are listed.
G4: the QA self-test proves the detectors fire on injected defects.
G5: asset, licence and credits tests pass; the in-game credits screen exists; no restricted music committed; `main_page.mp3` listed as unverified in release notes.
G6: no secrets, no oversized files, repo size reported.
G7: a production build served by `vite preview` passes smoke, visual and perf suites.
G8: the corrupted-geometry fixtures fail and the shipped GLBs pass the doctor.
G9: manual GPU confirmation: if you could not run the visual suite on a real GPU in automation, STOP before merging, produce the exact manual checklist for me, and do not merge until I confirm.

Procedure when all gates pass:
1. Create a safety tag on main: `main-before-rc1`. Record main's current commit.
2. Merge in two steps to keep main's history readable and small: (a) merge `rebuild/m4-design-system` (milestones M1 to M4) into main with `--no-ff` if it is not already merged; run `npm test` and `npm run build`. (b) bring in the rest as ONE squash merge of `qa/r3` (squash commit message: a detailed summary of the work, grouped by area, and a pointer to the branch and tags that keep the full history). Use squash for this step so large intermediate screenshots never enter main's history.
3. On main run the full gate suite again (G1, G2, G3, G7) against the merged tree. If any gate fails, do not push; fix on a branch from main and repeat.
4. Tag `v0.2.0-rc1` on main. Push main and the tag to `origin` (normal push only). If the push is rejected or branch protection requires a pull request, create a PR with `gh` if available (title, summary, link to the QA report and release notes) and stop there, reporting the URL; if `gh` is not available, tell me exactly what to do.
5. Keep `overnight/world-and-models`, `qa/r3` and all `*-green` tags as they are (full history).
Rollback instructions: write the exact commands to return main to `main-before-rc1` without rewriting shared history (revert the merge commit), in `docs/qa/ROLLBACK.md`.

Partial release rule (when "as much as possible" is the best outcome): if gates fail only because of an isolated area, build an integration branch from `qa/r3`, remove that area through `git revert` of the specific commits (never reset), re-run the gates, and release that. List precisely what was excluded and why, and leave the excluded work on a named branch for later. If the failure is global (rendering corruption, crashes, a real-GPU gate failure you cannot fix), do not merge anything beyond the M1 to M4 step, and say so plainly.

---

## 9. REPORTING

For each phase append to `docs/qa/LATEST_SUMMARY.md` and report in chat in the standard 5-section format, plus:
- A one-glance table: phase, result, commit hash, tag, evidence path.
- The GPU/browser header of every visual or performance run.
- A section "What I (the operator) should check on my GPU": 10 to 15 concrete items with the exact URL or command and what I should see (for example: Hardware Bay SLS exploded at 100 percent shows no streaks; Launch Pad shows the new Mobile Launcher and VAB without artefacts; orbit at 1x is readable; Saturn rings and shadow; Jupiter vs Sun scale in both modes; both music tracks start after a click and fade between scenes; rover stops at boulders and slides along them; stats overlay numbers with `?stats=1&desktop=1`).
- A candid list of everything you could not verify, and everything you changed that I did not ask for (it should be empty).
At the very end, summarise: gates passed or failed, what was merged to main (commit and tag), what was excluded, and the first three things I should do tomorrow.

## 10. RESUME PROMPT

"Resume R3. Read docs/qa/R3_PROMPT.md, docs/overnight/PROGRESS.md, DECISIONS.md and BLOCKERS.md, check the current branch and `git status`, and continue from the first unfinished item. Do not redo finished work."
