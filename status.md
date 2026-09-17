# Figma-to-Code Engine — Milestone Status

> Last updated: 2026-09-17 (Session 2)
> **Build**: `pnpm build` ✅ | **Tests**: 52 files / 212 tests / 0 failures ✅
> **Real E2E baseline**: Geometry **19.5%** | Perceptual **54.8%** | Fidelity **37.0%**

---

## Summary Table

| Milestone | Gate | Package Logic | Tests | CLI / Gate | Status |
|---|---|---|---|---|---|
| **M0** — Repo + contracts + fixtures | `pnpm build && pnpm test` green | ✅ | ✅ | N/A | ✅ **COMPLETE** |
| **M1** — Figma extraction + NodeIR | 3 fixtures parse deterministically | ✅ figma-client, figma-parser, design-ir | ✅ | ✅ `parse` live | ✅ **COMPLETE** |
| **M2** — HTML/CSS compiler + renderer | Ready screenshot + reproducible run | ✅ font-engine, code-generator, renderer, asset-engine | ✅ | ✅ `compile --file` + `render` live | ✅ **COMPLETE** |
| **M3** — Geometry + visual comparison | Real score + diff regions | ✅ geometry-engine, visual-engine, benchmark | ✅ | ✅ `compare` live, real scores correct | ✅ **COMPLETE** |
| **M4** — Root-cause + patch engine | Reversible deterministic patch loop | ✅ root-cause-engine, patch-engine | ✅ | N/A | ✅ **COMPLETE** |
| **M5** — Phase 2 rule optimizer | ≥90% avg fidelity, zero manual edits | ✅ optimizer | ✅ | ✅ `benchmark --suite phase2 --gate` wired | ⚠️ **Gate not yet passing** — fidelity 37% < 90% |
| **M6** — Candidate search + beam search | Best-version guarantee + bounded beam | ✅ layout-solver, beam-search, candidate-cache | ✅ | ✅ benchmark covers this | ⚠️ **Gate not yet passing** |
| **M7** — Responsive + visual/compositing | No unresolved critical failures | ✅ all 7 engines | ✅ | ✅ benchmark covers this | ⚠️ **Gate not yet passing** |
| **M8** — Phase 3 release gate | ≥95% fidelity on release benchmark | ✅ runner wired in CLI | N/A | `benchmark --suite phase3 --gate` | ❌ **NOT STARTED** |
| **M9** — AI integration | Unresolved-case-only escalation | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |
| **M10** — Production hardening | Security, observability, limits | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |

---

## 📊 Real Benchmark Results (Charles Prints — Hero Frame 1440×522)

| Run | Geometry | Perceptual | Fidelity | Notes |
|---|---|---|---|---|
| **Run 1** — no assets, no fonts | 19.5% | 56.5% | ~37% | Baseline — images missing |
| **Run 2** — with assets + font attempt | 19.5% | 54.8% | **37.0%** | Image visible ✅, fonts partially resolved |

> Score component weightings: Geometry 20% + Perceptual 20% (only 2 of 6 components active — Layout, Typography, Style, Assets components not yet scored)

---

## ✅ Completed This Session

### Image Asset Pipeline (M2 completion)
- `generate-css.ts` — `AssetMap` type + `background-image: url(file://...)` for IMAGE fills
- `cmd-compile.ts` — fetches `GET /files/{key}/images` → `meta.images` (imageRef hash → S3 URL), downloads via `asset-engine`, passes `AssetMap` to CSS generator
- Result: **t-shirt photo now renders** in the Chromium screenshot

### Score Bug Fixes
- `perceptualSimilarity` was being multiplied by 100 twice — fixed to show correct **54.8%**
- `computeFidelityScore` expects 0–1 range — geometry and perceptual now normalized before passing in
- Fidelity went from **274,925%** (bug) → **37.0%** (correct)

### asset-engine (full implementation)
- SHA-256 content-addressed download + cache (`ASSET_MISSING` / `ASSET_CORRUPT` typed errors)
- Cache-hit before network fetch, parallel batch `resolveAllAssets`
- 7 unit tests ✅

---

## 🔍 Why Fidelity Is 37% — Root Causes

| Root Cause | Impact | Fix |
|---|---|---|
| Layout drift — absolute positioning off | ~60% geometry error | M4/M5 root-cause + optimizer loop on real data |
| Custom fonts not loading (Google Fonts resolve fails for some) | Typography misalignment | Improve font fallback handling |
| Hero image positioned wrong (wrong node gets the image) | Large pixel diff | Verify node → fill mapping in figma-parser |
| Button colors wrong (blue instead of red/white) | Visual diff | Paint mapping gap in code-generator |
| Top half cut off in screenshot (page scrolls) | Missing content | Render viewport vs frame height mismatch |

---

## 🎯 Next Steps (Priority Order)

### 1. Fix layout positioning (biggest impact on geometry score)
- Root cause: absolute children use `node.relative.x/y` but Figma's relative coords may include parent padding offsets
- Fix in `generate-css.ts` → `computeAbsoluteChildSizing`

### 2. Fix button/paint color mapping
- Blue button background should be red — solid fill color being overridden somewhere
- Investigate `paintDeclarations` → SOLID fill priority vs IMAGE fill

### 3. Run benchmark gate
```powershell
node apps/cli/dist/index.js benchmark --suite phase2 `
  --fixtures benchmark/frames --gate
```

### 4. Add 2 more benchmark fixtures (medium + complex frames)
- Need 2 more Figma frame URLs from the Charles Prints file

---

## 📁 Key Output Files (Latest Run)

| File | Path |
|---|---|
| NodeIR (32 nodes) | `output/run-2026-09-17T10-42-59-329Z-1f217ee1/node-ir.json` |
| HTML + CSS (with assets) | `output/run-2026-09-17T10-59-50-235Z-5b0c024e/` |
| Screenshot (with image) | `output/run-2026-09-17T11-00-04-457Z-65af4b98/screenshot.png` |
| Compare report | `output/run-2026-09-17T11-01-30-715Z-910abd98/comparison.json` |
| Benchmark fixture | `benchmark/frames/simple/` (node-ir.json + reference.png) |

---

## 📁 Key Source Files

| File | Purpose |
|---|---|
| [`apps/cli/src/cmd-compile.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-compile.ts) | compile: fonts + assets + HTML/CSS |
| [`packages/code-generator/src/generate-css.ts`](file:///c:/secondsource/figmatocode/packages/code-generator/src/generate-css.ts) | CSS gen with AssetMap → background-image |
| [`packages/asset-engine/src/download.ts`](file:///c:/secondsource/figmatocode/packages/asset-engine/src/download.ts) | SHA-256 download + cache |
| [`apps/cli/src/cmd-compare.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-compare.ts) | compare: geometry + perceptual → fidelity |
| [`apps/cli/src/cmd-benchmark.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-benchmark.ts) | benchmark --gate |
