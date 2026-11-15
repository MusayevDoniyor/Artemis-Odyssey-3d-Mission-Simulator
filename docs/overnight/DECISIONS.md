# Overnight Architecture & Engineering Decisions

This file records all architectural, engineering, and asset decisions made autonomously during the overnight run, documenting the decision, the rationale, and the alternatives considered.

---

## Decision D0: Overnight Branch & Safety Configuration
- **Date**: 2026-11-16T02:04:00+05:00
- **Decision**: Created isolated branch `overnight/world-and-models` from `rebuild/m4-design-system`. Set up `.gitignore` for `assets-src/*` while tracking `assets-src/SOURCES.md`.
- **Why**: Protects `main` and earlier milestone branches from untested regressions; preserves tight repository size limits (<3 MB per GLB, <1.5 MB per audio file).
- **Alternatives Considered**: Direct work on `rebuild/m4-design-system` (rejected: separates design system milestone from overnight multi-phase asset overhaul).
