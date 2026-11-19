# Artemis Odyssey — Rollback & Recovery Runbook

This document details the emergency rollback procedure for `v0.2.0-rc1` release.

---

## 1. Safety Tag Anchor

Before merging `qa/r3` to `main`, a safety tag `main-before-rc1` is cut on the target commit of `main`.

To verify the safety anchor tag:
```bash
git rev-parse main-before-rc1
```

---

## 2. Immediate Rollback Procedure

If a critical regression (P0 crash, black screen, severe data loss) is identified on `main`:

```bash
# 1. Check out main
git checkout main

# 2. Reset hard to the pre-release safety tag
git reset --hard main-before-rc1

# 3. Clean untracked artifacts safely
git clean -df

# 4. If remote exists, push the rollback (ONLY with explicit confirmation)
# git push origin main --force

# 5. Rebuild and restart server
npm install
npm run build
npm run dev
```

---

## 3. Post-Rollback Investigation

1. Re-open branch `qa/r3`:
   ```bash
   git checkout qa/r3
   ```
2. Reproduce the defect using the automated QA suite:
   ```bash
   npm run qa:gpu -- --scene=<repro_scene_id>
   ```
3. Log the incident and root cause in `docs/overnight/BLOCKERS.md`.
