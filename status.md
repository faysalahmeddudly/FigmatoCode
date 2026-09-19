# Figma-to-Code Engine — Milestone Status

> Last updated: 2026-09-18 (Session 3)
> **Build**: `pnpm build` ✅ | **Tests**: 52 files / 212 tests / 0 failures ✅
> **Real E2E baseline**: Geometry **72.4%** | Perceptual **60.1%** | Fidelity **66.0%**

---

## Summary Table

| Milestone | Gate | Package Logic | Tests | CLI / Gate | Status |
|---|---|---|---|---|---|
| **M0** — Repo + contracts + fixtures | `pnpm build && pnpm test` green | ✅ | ✅ | N/A | ✅ **COMPLETE** |
| **M1** — Figma extraction + NodeIR | 3 fixtures parse deterministically | ✅ figma-client, figma-parser, design-ir | ✅ | ✅ `parse` live | ✅ **COMPLETE** |
| **M2** — HTML/CSS compiler + renderer | Ready screenshot + reproducible run | ✅ font-engine, code-generator, renderer, asset-engine | ✅ | ✅ `compile --file` + `render` live | ✅ **COMPLETE** |
| **M3** — Geometry + visual comparison | Real score + diff regions | ✅ geometry-engine, visual-engine, benchmark | ✅ | ✅ `compare` live, real scores correct | ✅ **COMPLETE** |
| **M4** — Root-cause + patch engine | Reversible deterministic patch loop | ✅ root-cause-engine, patch-engine | ✅ | N/A | ✅ **COMPLETE** |
| **M5** — Phase 2 rule optimizer | ≥90% avg fidelity, zero manual edits | ✅ optimizer | ✅ | ✅ `benchmark --suite phase2 --gate` wired | ⚠️ **Gate failing** — Avg fidelity 66% < 90% |
| **M6** — Candidate search + beam search | Best-version guarantee + bounded beam | ✅ layout-solver, beam-search, candidate-cache | ✅ | ✅ benchmark covers this | ⚠️ **Gate failing** |
| **M7** — Responsive + visual/compositing | No unresolved critical failures | ✅ all 7 engines | ✅ | ✅ benchmark covers this | ⚠️ **Gate failing** |
| **M8** — Phase 3 release gate | ≥95% fidelity on release benchmark | ✅ runner wired in CLI | N/A | `benchmark --suite phase3 --gate` | ❌ **NOT STARTED** |
| **M9** — AI integration | Unresolved-case-only escalation | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |
| **M10** — Production hardening | Security, observability, limits | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |

---

## 📊 Real Benchmark Results (Charles Prints — Hero Frame 1440×522)

| Run | Geometry | Perceptual | Fidelity | Notes |
|---|---|---|---|---|
| **Run 1** — no assets, no fonts | 19.5% | 56.5% | ~37% | Baseline — images missing, heavy layout drift |
| **Run 2** — with assets + font attempt | 19.5% | 54.8% | 37.0% | Image visible ✅, fonts partially resolved |
| **Run 3** — Layout Positioning Fix | 56.4% | 65.2% | 61.0% | Absolute layout fixed. T-shirt image side-by-side with text ✅ |
| **Run 4** — Z-Index & Button Paint | **72.4%** | **60.1%** | **66.0%** | Button correctly red, text visible, layout absolute offsets accurate ✅ |

> Score component weightings: Geometry 20% + Perceptual 20% (only 2 of 6 components active — Layout, Typography, Style, Assets components not yet scored)

---

## ✅ Completed This Session

### 1. Z-Index Stacking & Paint Colors Fixed
- Discovered that the missing red button background was actually an explicitly layered `ABSOLUTE` rectangle shadow placed perfectly inside an `AUTO_LAYOUT` frame.
- Modified CSS generator to apply `position: relative` to all standard non-absolute flow elements. This guarantees normal DOM elements properly overlay absolute backgrounds (establishing a stacking context) matching Figma's exact Z-index painting order.
- Button is now the correct red color with the "Start Designing Now" text proudly floating on top.
- Geometry score shot up to **72.5%** and Fidelity hit **66.0%**!

### 2. Absolute Positioning Bug Fixed
- Identified root cause of the -225px layout drift: Absolute children were using relative coords which caused parent offset errors.
- Added `positioning` to `LayoutIR` schema and extracted `layoutPositioning` from Figma API.
- Fixed `generate-css.ts` to compute `top` and `left` accurately from absolute deltas.

---

## 🔍 Why Fidelity Is 66% — Remaining Gaps

| Root Cause | Impact | Fix |
|---|---|---|
| Custom fonts not loading perfectly | Typography misalignment | Improve font fallback/resolution |
| Top half cut off in screenshot? | Missing content | Render viewport vs frame height mismatch |
| Pagination dots & video overlay offset | Geometry issues | Tweak bounding box rendering |

---

## 🎯 Next Steps (Priority Order)

### 1. Add 2 more benchmark fixtures (medium + complex frames)
- Need 2 more Figma frame URLs from the Charles Prints file to build out the M5 benchmark suite.

### 2. Run benchmark gate
```powershell
node apps/cli/dist/index.js benchmark --suite phase2 `
  --fixtures benchmark/frames --gate
```

---

## 📁 Key Output Files (Latest Run)

| File | Path |
|---|---|
| NodeIR (32 nodes) | `output/run-2026-09-17T10-42-59-329Z-1f217ee1/node-ir.json` (patched) |
| HTML + CSS (with assets) | `output/run-2026-09-18T08-25-45-010Z-5b0c024e/` |
| Screenshot (button fixed) | `output/run-2026-09-18T09-48-55-318Z-9823c99b/screenshot.png` |
| Compare report | `output/run-2026-09-18T09-51-38-128Z-a81bf791/comparison.json` |

