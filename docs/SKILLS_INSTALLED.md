# Curated Agent Skills Audit & Installation Report

## Overview
This document records the curated agent skills installed for Google Antigravity, following the open `agentskills.io` standard, Antigravity discovery conventions, and security guidelines.

Active skills are strictly capped at 28 to minimize prompt token overhead, prevent context dilution, and avoid conflicting system prompts. All other evaluated skills have been either archived to inactive storage (`~/.gemini/skills-optional/`) or rejected.

---

## 1. Active Skills: Global (`~/.gemini/antigravity/skills/`) - 24 Skills
General-purpose engineering, foundations, performance, backend, graphics, and UI craft skills installed machine-wide.

| Skill Name | Source URL | Install Location | Purpose | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`code-review-excellence`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/code-review-excellence) | `~/.gemini/antigravity/skills/code-review-excellence` | Constructive, severity-tiered code reviews focusing on correctness, maintainability, and security. | Structured feedback playbook with actionable severity tags (blocking, important, nit); avoids gatekeeping. |
| **`git-commit-formatter`** | [rominirani/antigravity-skills](https://github.com/rominirani/antigravity-skills/tree/main/skills_tutorial/git-commit-formatter) | `~/.gemini/antigravity/skills/git-commit-formatter` | Enforces Conventional Commits specification (`feat:`, `fix:`, `chore:`, etc.) for clean VCS history. | Official Google Codelab skill; deterministic, lightweight, zero overhead, perfectly enforces team git hygiene. |
| **`bash-defensive-patterns`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/bash-defensive-patterns) | `~/.gemini/antigravity/skills/bash-defensive-patterns` | Production-grade defensive shell scripting, strict mode (`set -euo pipefail`), and signal traps. | Prevents silent failures, unsafe variable expansions, and destructive commands in CI/CD and deployment scripts. |
| **`tdd-workflows-tdd-cycle`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/tdd-workflows-tdd-cycle) | `~/.gemini/antigravity/skills/tdd-workflows-tdd-cycle` | Enforces Red-Green-Refactor test-driven development with fail-first verification and coverage thresholds. | Eliminates untested code regressions by requiring verification of failing tests before writing implementations. |
| **`code-refactoring-refactor-clean`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/code-refactoring-refactor-clean) | `~/.gemini/antigravity/skills/code-refactoring-refactor-clean` | Clean code, SOLID design principles, smell eradication, and safe behavior-preserving refactoring slices. | Provides structured refactoring playbooks to reduce cyclomatic complexity without breaking downstream callers. |
| **`debugging-strategies`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/debugging-strategies) | `~/.gemini/antigravity/skills/debugging-strategies` | Systematic root-cause analysis, binary search problem isolation, and crash/log investigation. | Forbids guessing fixes; forces scientific hypothesis testing, instrumentation, and empirical reproduction. |
| **`wcag-audit-patterns`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/wcag-audit-patterns) | `~/.gemini/antigravity/skills/wcag-audit-patterns` | End-to-end WCAG 2.2 accessibility audits (contrast, keyboard navigation, screen readers, ARIA). | Covers automated scanning + manual verification with explicit criterion mapping to ensure compliant UIs. |
| **`react-modernization`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/react-modernization) | `~/.gemini/antigravity/skills/react-modernization` | React version upgrades, functional patterns, custom hooks, and concurrent feature adoption. | Guides modern React 18/19 migrations (Suspense, transitions) while eliminating deprecated lifecycle methods. |
| **`core-web-vitals`** | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/tree/main/skills/core-web-vitals) | `~/.gemini/antigravity/skills/core-web-vitals` | Targeted optimization for LCP, INP, and CLS using real-user CrUX data and DevTools performance traces. | Authored by Addy Osmani (Google Chrome team lead); measurement-first, field-data driven, zero speculation. |
| **`web-performance`** | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills/tree/main/skills/performance) | `~/.gemini/antigravity/skills/web-performance` | Bundle size budgets (<300KB JS), critical rendering path tuning, resource compression, and TTFB. | Definitive web performance budget and measurement methodology directly aligned with Chrome Lighthouse & CrUX. |
| **`performance-engineer`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/performance-engineer) | `~/.gemini/antigravity/skills/performance-engineer` | Full-stack profiling workflows: OpenTelemetry distributed tracing, CPU flame graphs, and load testing. | Bridges frontend metrics with backend APM, distributed tracing, database query profiling, and multi-tier caching. |
| **`api-design-principles`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/api-design-principles) | `~/.gemini/antigravity/skills/api-design-principles` | RESTful and GraphQL API contract design, error conventions, pagination, and semantic versioning. | Establishes ergonomic, predictable API contracts before coding; includes concrete schema design checklists. |
| **`postgresql`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/postgresql) | `~/.gemini/antigravity/skills/postgresql` | PostgreSQL table schema design, data types (`BIGINT IDENTITY`, `TIMESTAMPTZ`), indexing, and RLS. | Prevents common relational mistakes (e.g., missing FK indexes, improper UUID usage, unindexed join keys). |
| **`sql-optimization-patterns`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/sql-optimization-patterns) | `~/.gemini/antigravity/skills/sql-optimization-patterns` | Systematic SQL query tuning, EXPLAIN/ANALYZE plan interpretation, composite indexes, and N+1 fixes. | Teaches the agent to read query execution plans, diagnose sequential scans, and design covering indexes. |
| **`security-auditor`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/security-auditor) | `~/.gemini/antigravity/skills/security-auditor` | DevSecOps security auditing, OWASP Top 10 vulnerabilities, threat modeling, and authentication reviews. | Comprehensive application security review covering input sanitization, auth flows, and dependency audits. |
| **`gemini-api-dev`** | [google-gemini/gemini-skills](https://github.com/google-gemini/gemini-skills/tree/main/skills/gemini-api-dev) | `~/.gemini/antigravity/skills/gemini-api-dev` | Current Google Gemini API development guide for modern models, multimodal agents, and official SDKs. | Official Google Gemini skill; strictly enforces current model names and prevents hallucinated legacy SDK calls. |
| **`threejs-asset-pipeline`** | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-asset-pipeline) | `~/.gemini/antigravity/skills/threejs-asset-pipeline` | Shrinks and optimizes 3D glTF/GLB models using `@gltf-transform/cli`, Draco, Meshopt, and KTX2 textures. | Covers inspection, compression, and loader setups for WebGL asset delivery. |
| **`threejs-performance`** | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-performance) | `~/.gemini/antigravity/skills/threejs-performance` | Three.js runtime speed, draw call reduction via instancing/merging, memory leak prevention, and GPU stats. | Solves WebGL/Three.js render jank, CPU frame bottlenecks, and memory disposal issues. |
| **`threejs-shaders`** | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-shaders) | `~/.gemini/antigravity/skills/threejs-shaders` | Custom GLSL vertex and fragment shaders, uniforms, varyings, extending materials, and WebGPU TSL porting. | Provides exact shader chunk and custom ShaderMaterial patterns for WebGL rendering without third-party libraries. |
| **`git-advanced-workflows`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/git-advanced-workflows) | `~/.gemini/antigravity/skills/git-advanced-workflows` | Advanced git operations: interactive rebase, `git bisect` for regression hunts, `git worktree` isolation, and reflog. | Complements `git-commit-formatter` with recovery, history maintenance, and parallel branch workflows. |
| **`architecture-decision-records`** | [rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills/tree/main/skills/architecture-decision-records) | `~/.gemini/antigravity/skills/architecture-decision-records` | Documents technical, database, and infrastructure choices using standard Architecture Decision Records (MADR). | Preserves rationale, evaluated alternatives, and consequences for non-trivial engineering choices. |
| **`skill-creator`** | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/skill-creator) | `~/.gemini/antigravity/skills/skill-creator` | Official skill creation, validation, packaging, and evaluation toolkit. | Standardizes the authoring of new skills following the `agentskills.io` specification. Scripts run only upon explicit user request. |
| **`webapp-testing`** | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | `~/.gemini/antigravity/skills/webapp-testing` | Playwright-based testing toolkit for interacting with and validating local web applications. | Manages local server lifecycles and browser assertions. Scripts run only upon explicit user request. |
| **`ui-quality-standards`** | Local / Antigravity Constitution | `~/.gemini/antigravity/skills/ui-quality-standards` | Enforces vector SVG icons, strict 8-pt spatial geometry, nested border radii, 8-state interactive feedback, and mandatory cursor pointers. | Extracted from previous global constitution. Explicitly notes that project design systems and tokens take precedence. |

---

## 2. Active Skills: Project-Level (`.agent/skills/`) - 2 Skills
Specialized design-system synthesis and UI prompt engineering skills installed at the workspace/project level.

| Skill Name | Source URL | Install Location | Purpose | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`design-md`** | [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills/tree/main/plugins/stitch-utilities/skills/design-md) | `.agent/skills/design-md` | Synthesizes semantic design systems and tokens into `DESIGN.md` contracts from Google Stitch projects. | Official Google Labs skill; anchors UI generation to a persistent design token contract without hallucinated styles. |
| **`enhance-prompt`** | [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills/tree/main/plugins/stitch-utilities/skills/enhance-prompt) | `.agent/skills/enhance-prompt` | Transforms vague UI requests into detailed, platform-aware prompts with explicit design token injection. | Systematically adds structural hierarchy, component keywords, and aesthetic descriptors to user briefs. |

---

## 3. Active Skills: Workspace Kept (`.agents/skills/`) - 2 Skills
Retained selectively from `.agents/skills/` for component implementation and design system primitives.

| Skill Name | Install Location | Purpose | Rationale |
| :--- | :--- | :--- | :--- |
| **`frontend-design`** | `~/.agents/skills/frontend-design` | Distinctive frontend design execution within established brand and design systems. | Production-grade frontend layout and design patterns; complements global UI standards. |
| **`radix-ui-design-system`** | `~/.agents/skills/radix-ui-design-system` | Headless, accessible primitives and compound component patterns with Radix UI. | Provides accessible unstyled UI primitives; clean integration with Tailwind. |

---

## 4. Optional / Archived Skills (`~/.gemini/skills-optional/`) - 29 Skills Total
These skills reside in categorized subfolders under `~/.gemini/skills-optional/`, an archived location outside Antigravity's discovery paths. They **never load into agent context automatically**.

To activate any archived skill in a specific project, copy its folder to that project's `.agent/skills/<skill-name>`.

### 4.1 Security Skills (`~/.gemini/skills-optional/security/`, 5 skills)
*Opt-in only due to high risk profiles, dual-use reversing techniques, or credential handling.*

| Skill Name | Purpose | Risk Notes |
| :--- | :--- | :--- |
| **`anti-reversing-techniques`** | Binary protection, anti-debugging mechanisms, and obfuscation analysis. | **Dual-Use Risk**: Contains methods for bypassing debuggers. |
| **`binary-analysis-patterns`** | Binary disassembly, executable structure (ELF/PE), and control flow analysis. | **Analysis Risk**: Deep reverse-engineering techniques. |
| **`malware-analyst`** | Static and dynamic analysis of suspicious binaries, unpacking, and IOC extraction. | **Host Safety Risk**: Involves handling malicious payloads; sandbox required. |
| **`protocol-reverse-engineering`** | Network packet analysis, wire format reverse engineering, and state machine extraction. | **Network Risk**: Packet inspection and protocol decoding. |
| **`secrets-management`** | Enterprise key management patterns, Vault, AWS Secrets Manager, and rotation policies. | **Credential Risk**: Deals directly with credential stores and key lifecycles. |

### 4.2 Hazard Skills (`~/.gemini/skills-optional/hazards/`, 1 skill)
*Quarantined due to aggressive unprompted actions.*

| Skill Name | Reason for Quarantine |
| :--- | :--- |
| **`project-init-10x`** | **Hazard**: Automatically triggers on entering ANY folder to scan stack, create branches, and overwrite `AGENTS.md`. Directly violates Section 2 of the Constitution. |

### 4.3 Tool / Heavy Skills (`~/.gemini/skills-optional/tools/`, 2 skills)
*Quarantined due to massive context token load or narrow utility.*

| Skill Name | Reason for Quarantine |
| :--- | :--- |
| **`ui-ux-pro-max`** | **Context Bloat**: Massive reference dataset (192 palettes, 74 font pairings, 119 guidelines). Consumes excessive context tokens on discovery. |
| **`landing-page-generator`** | **Heavy Template Scaffold**: Opinionated Next.js/Tailwind landing page generator with copywriting frameworks; redundant with core skills. |

### 4.4 Marketing & Growth Skills (`~/.gemini/skills-optional/marketing/`, 9 skills)
*Quarantined because non-engineering marketing/copywriting skills are out of scope for software engineering tasks.*

| Skill Name | Purpose |
| :--- | :--- |
| **`brand-growth-system-builder`** | SME brand, website, local SEO, content, and cloud-planning workflows. |
| **`copywriting-psychologist`** | Conversion copy using audience awareness and motivations. |
| **`cro-optimizer`** | Conversion rate optimization for marketing pages and forms. |
| **`growth-engine`** | Growth hacking, SEO, ASO, viral loops, and referral systems. |
| **`growth-loops`** | Recurring automated marketing loops and review cadences. |
| **`marketing-copywriting`** | Marketing headlines, value propositions, and page copy. |
| **`marketing-psychology`** | Mental models, cognitive biases, and behavioral economics for marketing. |
| **`onboarding-ux-optimizer`** | Post-signup onboarding, activation rates, and first-run experience. |
| **`signup-flow-optimizer`** | Registration, account creation, and free trial conversion optimization. |

### 4.5 Redundant & Overlapping Skills (`~/.gemini/skills-optional/duplicates/`, 12 skills)
*Archived to eliminate prompt competition, duplicate guidance, and context dilution.*

| Skill Name | Superceded By | Reason |
| :--- | :--- | :--- |
| **`anti-slop-design`** | `ui-quality-standards` + `frontend-design` | Redundant UI anti-slop rules; covered by clean tokens and craft standards. |
| **`anti-ui-slop`** | `ui-quality-standards` + `frontend-design` | Redundant UI anti-slop rules; consolidated into global craft standards. |
| **`api-webhook-integration`** | `api-design-principles` | Standard webhook signature and idempotency patterns covered by API design principles. |
| **`apple-design`** | `ui-quality-standards` + `frontend-design` | Apple-specific motion and typography styling; overlaps with core design skills. |
| **`autonomous-quality-gate`** | Global Constitution & Workflows | Rigid automated build/test enforcement; replaced by Antigravity Constitution and `/ship-check`. |
| **`defensive-debugging`** | `debugging-strategies` | Scratch script isolation and error inspection; fully covered by `debugging-strategies`. |
| **`live-data-simulation`** | `ui-quality-standards` | Domain-authentic mock data requirement already encoded in `ui-quality-standards`. |
| **`micro-interactions`** | `ui-quality-standards` | 8-state interactive feedback and active scaling already codified in `ui-quality-standards`. |
| **`multi-file-refactoring`** | `code-refactoring-refactor-clean` | Cross-file dependency analysis covered by standard clean refactoring workflows. |
| **`tailwind-design-system`** | `ui-quality-standards` + `radix-ui-design-system` | Tailwind design token conventions already handled by project config and design systems. |
| **`tastegate`** | `ui-quality-standards` + `webapp-testing` | Visual and contrast checks covered by craft standards and Playwright audit patterns. |
| **`ui-ux-designer`** | `frontend-design` + `ui-quality-standards` | Generic UI/wireframe prompt; overlaps with focused frontend and design token skills. |

---

## 5. Skills Reviewed and Not Installed / Skipped

| Skill Name | Source | Reason for Skipping / Rejection |
| :--- | :--- | :--- |
| **`threejs-react-three-fiber`** | `CloudAI-X/threejs-skills` | **Skipped by User Directive**: Project uses imperative Three.js and operator does not want an R3F migration. |
| **`godot-gdscript-patterns`** | `rmyndharis-skills` | **Skipped by User Directive**: Irrelevant to current stack. |
| **`api-documenter`** | `rmyndharis-skills` | **Skipped by User Directive**: Not needed now. |
| **`e2e-testing-patterns`** | `rmyndharis-skills` | **Skipped by User Directive**: Not needed now. |
| **`typescript-advanced-types`** | `rmyndharis-skills` | **Skipped by User Directive**: Not needed now. |
| **`canvas-design`** | `anthropics/skills` | **Skipped by User Directive / Mischaracterization**: Creates static poster/manifesto art in PDF/PNG (not web UI canvas). Not needed now. |
| **`theme-factory`** | `anthropics/skills` | **Skipped by User Directive / Mischaracterization**: Applies 10 preset document themes to presentation slides/reports (not web app CSS tokens). Not needed now. |
| **`react-components`** | `google-labs-code/stitch-skills` | **Skipped by User Directive**: Relies on Stitch MCP and Vite-specific component scaffolds. Contains bash fetch and `@swc/core` validation scripts that can conflict with custom build chains. |
| **`database-schema-validator`** | `rominirani/antigravity-skills` | **Skipped by User Directive**: Contains Python script enforcing overly rigid regex constraints (compulsory PK named `id`) unsuitable for flexible production schemas. |
| `code-reviewer`, `code-review-ai-ai-review`, `comprehensive-review-*` | `rmyndharis-skills` | **Duplicate / Prompt Dilution**: Overlapping prompt clones that compete for context matching. Consolidated into `code-review-excellence`. |
| `tdd-workflows-tdd-green`, `tdd-workflows-tdd-red`, `tdd-workflows-tdd-refactor`, `tdd-orchestrator` | `rmyndharis-skills` | **Micro-Fragmentation**: Unnecessary 4-way micro-split of a single TDD lifecycle. Consolidated into `tdd-workflows-tdd-cycle`. |
| `error-debugging-error-analysis`, `error-debugging-error-trace`, `error-detective`, `error-diagnostics-*` | `rmyndharis-skills` | **Duplicate / Low Signal**: 7 redundant error debugging prompts. Consolidated into `debugging-strategies` and existing `defensive-debugging`. |
| `conductor-implement`, `conductor-manage`, `conductor-setup`, etc. | `rmyndharis-skills` | **Tool Specific**: 7 micro-skills tied to an internal proprietary workflow orchestrator. Irrelevant to general development. |
| `minecraft-bukkit-pro`, `arm-cortex-expert`, `employment-contract-templates`, `solidity-security` | `rmyndharis-skills` | **Domain Irrelevant**: Hyper-niche domain skills unrelated to general-purpose web, backend, and full-stack engineering. |
