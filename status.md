# Figma-to-Code Engine — Milestone Status

> **Build**: `pnpm build` ✅ | **Tests**: 51 files / 205 tests / 0 failures ✅

---

## Summary Table

| Milestone | Gate | Package Logic | Tests | CLI Wired | Status |
|---|---|---|---|---|---|
| **M0** — Repo + contracts + fixtures | `pnpm build && pnpm test` green | ✅ shared-contracts schemas | ✅ | N/A | ✅ **COMPLETE** |
| **M1** — Figma extraction + NodeIR | 3 fixtures parse deterministically | ✅ figma-client, figma-parser, design-ir | ✅ | N/A | ✅ **COMPLETE** (unit-level; real API needs Figma key) |
| **M2** — HTML/CSS compiler + renderer | Ready screenshot + reproducible run | ✅ font-engine, code-generator, renderer | ✅ | N/A | ⚠️ **~90%** — `asset-engine` is empty stub |
| **M3** — Geometry + visual comparison | Real score + diff regions | ✅ geometry-engine, visual-engine | ✅ | N/A | ✅ **COMPLETE** |
| **M4** — Root-cause + patch engine | Reversible deterministic patch loop | ✅ root-cause-engine, patch-engine | ✅ | N/A | ✅ **COMPLETE** |
| **M5** — Phase 2 rule optimizer | ≥90% avg fidelity, zero manual edits | ✅ optimizer (score-acceptance, regression-log, optimizer-loop) | ✅ | ❌ `figma-engine benchmark --suite phase2 --gate` not wired | ⚠️ **~85%** — CLI gate missing |
| **M6** — Candidate search + beam search | Best-version guarantee + bounded beam | ✅ layout-solver, beam-search, candidate-cache | ✅ | ❌ CLI gate not wired | ⚠️ **~85%** — CLI gate missing |
| **M7** — Responsive + visual/compositing | No unresolved critical responsive failures | ✅ responsive-engine, flow-engine, paint-engine, compositing-engine, clipping-engine, stacking-engine, effect-engine | ✅ | ❌ CLI gate not wired | ⚠️ **~85%** — CLI gate missing |
| **M8** — Phase 3 release gate | ≥95% fidelity on release benchmark | ❌ benchmark runner not wired | ❌ | ❌ | ❌ **NOT STARTED** |
| **M9** — AI integration | Unresolved-case-only escalation | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |
| **M10** — Production hardening | Security, observability, limits | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |

---

## Two Hard Gaps Blocking Everything Downstream

### ❌ Gap 1: `asset-engine` — Empty Stub
**File**: [`packages/asset-engine/src/index.ts`](file:///c:/secondsource/figmatocode/packages/asset-engine/src/index.ts) — literally `export {};`

**Needed for M2**: asset download → hash → content-addressed local path (§14.6). Code-generator and renderer can run without real assets, but M2's gate requires a fully reproducible run with correct asset provenance.

### ❌ Gap 2: `apps/cli` — Empty Stub
**File**: [`apps/cli/src/index.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/index.ts) — literally `export {};`

**Needed for M5–M8 gates**: Every milestone from M5 onward is machine-checked with:
```
figma-engine benchmark --suite phase2 --gate
figma-engine benchmark --suite phase3 --gate
```
None of these can run without a real CLI.

---

## What's Actually Done (Beyond Tests)

All of these have **real, non-trivial logic** — not stubs:

| Package | Key Logic Implemented |
|---|---|
| `shared-contracts` | Full Zod schemas: NodeIR, LayoutIR, VisualIR, Patch, failures, events |
| `figma-client` | REST API wrapper, typed errors, retry/backoff |
| `figma-parser` | Recursive traversal → NodeIR, layout/paint/radius mapping |
| `design-ir` | Schema validation, boundary enforcement |
| `font-engine` | Google Fonts resolve, hash, cache (no silent substitution) |
| `code-generator` | Deterministic HTML/CSS from NodeIR (flex, gap, padding, etc.) |
| `renderer` | Playwright/Chromium, readiness gate, DOM rect measurement, context isolation |
| `geometry-engine` | Per-node dx/dy/dw/dh + fidelity score |
| `visual-engine` | Screenshot normalize → pixel-diff → region merge → ownership → perceptual similarity |
| `root-cause-engine` | Ancestor-first diagnosis, classify, evidence record |
| `patch-engine` | Full state machine PROPOSED→COMMITTED/ROLLED_BACK, reverse patch, mutation boundaries |
| `optimizer` | Score acceptance gate, regression log, optimizer loop, **beam search (beamWidth=3, maxIterations=20)**, candidate cache |
| `layout-solver` | Size/gap/alignment candidate generation (one hypothesis dimension at a time) |
| `responsive-engine` | All §17.2 checks: overflow, collision, wrap, displacement, instability, horizontal scroll, aspect ratio |
| `flow-engine` | SHORT/NORMAL/LONG/EXTREME stress suite, content-hiding rejection |
| `paint-engine` | Gradient → CSS mapping |
| `compositing-engine` | Blend mode / opacity mapping |
| `clipping-engine` | Clip + mask → CSS mapping |
| `stacking-engine` | z-index / paint order |
| `effect-engine` | Shadow + blur → CSS mapping |

---

## 🎯 Recommended Next Steps

### Priority 1 — Fill the two gaps (unlocks M2 gate + all CLI gates)

1. **Implement `asset-engine`**: download, hash (SHA-256), content-addressed local path → `ASSET_DOWNLOAD_FAILED` on network error
2. **Implement `apps/cli`**: commander-based CLI wiring `figma-engine parse | compile | render | compare | benchmark` per §20.1

### Priority 2 — Run M5/M6/M7 benchmark gates (once CLI exists)
```
figma-engine benchmark --suite phase2 --gate   # M5 gate: ≥90% fidelity
figma-engine benchmark --suite phase3 --gate   # M8 gate: ≥95% fidelity
```

### Priority 3 — Real Figma fixture data
Still need: **Figma file key + node ID** to produce real `benchmark/frames/{simple,medium,complex}/` fixtures for end-to-end runs.

---

> [!IMPORTANT]
> M6 and M7 package logic **is complete**. What's missing is not more logic — it's the **CLI that wires them together** and the **benchmark runner** that calls the gate command. Once the CLI is built, M5/M6/M7 can be formally gate-checked.
