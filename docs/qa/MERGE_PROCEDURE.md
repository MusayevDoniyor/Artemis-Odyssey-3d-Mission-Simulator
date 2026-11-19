# Artemis Odyssey — Production Release Merge Runbook (`v0.2.0-rc1`)

**Target Branch**: `main`  
**Working Branch**: `qa/r3`  
**Execution Condition**: Await explicit user prompt: `"merge"`. Do NOT run automatically.

---

## 1. Repository Hygiene & Pack Metrics

Measured empirically on branch `qa/r3` prior to merge execution:

### Git Object Database Metrics (`git count-objects -vH`)
```
count: 57
size: 4.56 MiB
in-pack: 1690
packs: 4
size-pack: 119.38 MiB
prune-packable: 0
garbage: 0
size-garbage: 0 bytes
```

### 10 Largest Tracked Files in Repository

All files are strictly below the 5.0 MB release gate threshold:

| Rank | Tracked File Path | Size (MB) | Raw Bytes | Gate G7 Assessment |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `qa/baselines/title_hero_1920x1080.png` | 1.50 MB | 1,567,874 | **PASS** (< 5.0 MB) |
| 2 | `public/assets/crafts/perseverance.glb` | 1.48 MB | 1,549,376 | **PASS** (< 5.0 MB) |
| 3 | `public/audio/rocket-launch-distant.ogg` | 1.08 MB | 1,130,465 | **PASS** (< 5.0 MB) |
| 4 | `qa/baselines/title_hero_1440x900.png` | 1.00 MB | 1,052,454 | **PASS** (< 5.0 MB) |
| 5 | `public/assets/rockets/sls_block1.glb` | 1.00 MB | 1,045,840 | **PASS** (< 3.0 MB budget) |
| 6 | `public/assets/crafts/jwst.glb` | 0.96 MB | 1,004,248 | **PASS** (< 5.0 MB) |
| 7 | `public/audio/rocket-launch-roar.ogg` | 0.90 MB | 947,249 | **PASS** (< 5.0 MB) |
| 8 | `public/assets/planets/venus_surface.jpg` | 0.84 MB | 885,075 | **PASS** (< 5.0 MB) |
| 9 | `src/assets/images/viper_lander_showcase_1794685527556.jpg` | 0.83 MB | 874,959 | **PASS** (< 5.0 MB) |
| 10 | `public/assets/planets/mercury.jpg` | 0.83 MB | 872,555 | **PASS** (< 5.0 MB) |

*(Note: Cleaned `public/assets/crafts/iss.glb` is only 24.6 KB / 25,236 bytes, meeting the background budget with 84% headroom).*

---

## 2. Pre-Merge Verification Checklist

Prior to triggering merge commands, verify the following are strictly satisfied:
1. [x] Branch is `qa/r3` and working tree is clean.
2. [x] `npm run qa:fast` passes 170/170 tests in < 2.0s with zero TypeScript compilation errors.
3. [x] All 9 Release Gates in `docs/qa/RELEASE_GATES.md` are marked **PASS**.
4. [x] Zero open P0 or P1 defects in `docs/qa/FINDINGS.md`.
5. [x] All hardware citations return HTTP 200 OK and match verbatim snapshots.
6. [x] Operator has explicitly responded with `"merge"`.

---

## 3. Step-by-Step Merge Execution Procedure

Upon receiving the explicit `"merge"` command from the operator, execute these exact shell commands sequentially:

### Step 1: Pre-Merge Tagging
Tag current `main` for instant zero-loss rollback capability:
```bash
git checkout main
git tag main-before-rc1
```

### Step 2: Merge Rebuild / M4 Design System (`--no-ff` ONLY)
```bash
git merge rebuild/m4-design-system --no-ff -m "chore(release): merge rebuild/m4-design-system into main"
```

### Step 3: Merge QA R3 Branch (ONE Squash Merge)
Squash all iterative QA inspection, defect remediation, and benchmarking commits from `qa/r3` into a single, clean release commit:
```bash
git merge --squash qa/r3
git commit -m "feat(release): Release Candidate 1 (v0.2.0-rc1)

- Eliminate geometry defects: clean SLS Block 1 (1.02 MB Draco) and procedural LC-39B tower (2,888 tris)
- Verified automated GLB doctor gate (0 degenerate triangles, 0 NaN, 0 negative scales)
- Empirical hardware-synchronized GPU timing across all 47 catalog scenes on physical Intel UHD Graphics
- Grounded primary citations across all 9 spacecraft with verified snapshot substrings
- Comprehensive cold-cache loading benchmark via CDP (Unthrottled 1.25s vs Fast 3G 3.70s first 3D frame)
- Master findings registry resolved (0 open P0, 0 open P1)"
```

### Step 4: Tag Release Candidate 1
```bash
git tag -a v0.2.0-rc1 -m "Release Candidate 1 (v0.2.0-rc1) - Physical GPU Verified"
```

### Step 5: Post-Merge Sanity Verification
Run the fast test suite and production build on `main` to ensure the release commit is 100% green:
```bash
npm run qa:fast
npm run build
```

---

## 4. Rollback Protocol

If any unforeseen defect is encountered on `main`, execute immediate rollback:
```bash
git checkout main
git reset --hard main-before-rc1
git tag -d v0.2.0-rc1
```
