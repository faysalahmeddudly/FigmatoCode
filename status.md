# Figma-to-Code Engine — Milestone Status

> Last updated: 2026-09-17
> **Build**: `pnpm build` ✅ | **Tests**: 52 files / 212 tests / 0 failures ✅
> **First real E2E run**: ✅ Figma → NodeIR → HTML/CSS → Chromium → Compare (baseline 19.5% geometry)

---

## Summary Table

| Milestone | Gate | Package Logic | Tests | CLI / Fixtures | Status |
|---|---|---|---|---|---|
| **M0** — Repo + contracts + fixtures | `pnpm build && pnpm test` green | ✅ shared-contracts schemas | ✅ | N/A | ✅ **COMPLETE** |
| **M1** — Figma extraction + NodeIR | 3 fixtures parse deterministically | ✅ figma-client, figma-parser, design-ir | ✅ | ✅ `parse` command live | ✅ **COMPLETE** |
| **M2** — HTML/CSS compiler + renderer | Ready screenshot + reproducible run | ✅ font-engine, code-generator, renderer, **asset-engine** | ✅ | ✅ `compile` + `render` live | ⚠️ **~95%** — asset-engine not wired into compile yet |
| **M3** — Geometry + visual comparison | Real score + diff regions | ✅ geometry-engine, visual-engine | ✅ | ✅ `compare` live, real score: 19.5% geo | ✅ **COMPLETE** (pipeline proven) |
| **M4** — Root-cause + patch engine | Reversible deterministic patch loop | ✅ root-cause-engine, patch-engine | ✅ | N/A | ✅ **COMPLETE** |
| **M5** — Phase 2 rule optimizer | ≥90% avg fidelity, zero manual edits | ✅ optimizer (score-acceptance, regression-log, optimizer-loop) | ✅ | ✅ `benchmark --suite phase2 --gate` wired | ⚠️ **~90%** — gate needs real fixture score ≥90% |
| **M6** — Candidate search + beam search | Best-version guarantee + bounded beam | ✅ layout-solver, beam-search, candidate-cache | ✅ | ✅ benchmark command covers this | ⚠️ **~90%** — gate needs real fixture score |
| **M7** — Responsive + visual/compositing | No unresolved critical responsive failures | ✅ responsive-engine, flow-engine, paint-engine, compositing-engine, clipping-engine, stacking-engine, effect-engine | ✅ | ✅ benchmark command covers this | ⚠️ **~90%** — gate needs real fixture score |
| **M8** — Phase 3 release gate | ≥95% fidelity on release benchmark | ✅ benchmark runner wired in CLI | N/A | `figma-engine benchmark --suite phase3 --gate` | ❌ **NOT STARTED** — needs fidelity improvement first |
| **M9** — AI integration | Unresolved-case-only escalation | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |
| **M10** — Production hardening | Security, observability, limits | ❌ | ❌ | ❌ | ❌ **NOT STARTED** |

---

## ✅ Completed This Session

### CLI — `apps/cli` (was empty stub → now fully wired)
| Command | Status |
|---|---|
| `figma-engine parse --file <key> --node <id>` | ✅ Live — fetches Figma API, validates NodeIR, writes output |
| `figma-engine compile --ir <path>` | ✅ Live — NodeIR → deterministic HTML + CSS |
| `figma-engine render --html <path> --width <w> --height <h>` | ✅ Live — real Chromium screenshot + DOM metrics |
| `figma-engine compare --ir --reference --candidate --dom-metrics` | ✅ Live — geometry + visual diff → fidelity score |
| `figma-engine benchmark --suite <phase> --gate` | ✅ Live — full pipeline per fixture, exits 0/1 on gate |

### asset-engine — `packages/asset-engine` (was empty stub → now implemented)
- SHA-256 content-addressed download + cache
- `ASSET_MISSING` / `ASSET_CORRUPT` typed errors (§21.1)
- Cache-hit before network, parallel batch `resolveAllAssets`
- 7 unit tests ✅

### First Real End-to-End Run
- **Figma file**: Charles Prints (`si0LCoBsffi63CK8doDsO4`)
- **Frame**: node `61:22583` (Hero section, 1440×522)
- **Nodes parsed**: 32
- **Baseline scores**:
  - Geometry: **19.5%** (positioning/sizing errors — expected at M2 baseline)
  - Perceptual similarity: **56.5%** (images missing, fonts not loaded)
  - Diff regions: **795** (326,936 mismatched pixels / 751,680 total)
- **Fixture saved**: `benchmark/frames/simple/node-ir.json` + `reference.png`

---

## 🔍 Why Baseline Score Is Low (Expected)

| Root Cause | Fix Needed |
|---|---|
| Images missing (empty placeholders) | Wire `asset-engine` into `compile` command |
| Custom fonts not loading | Wire `resolveAndCacheFont` into `compile` + inject `@font-face` |
| Absolute positioning drift | M4/M5 root-cause + optimizer loop |
| Button colors wrong | paint-engine → CSS mapping gap |

---

## 🎯 Immediate Next Steps

### 1. Wire `asset-engine` into `compile` (highest impact on score)
- Download image fills during compile → embed as `<img src="...">` or `background-image`
- Expected score jump: **+20–30%** perceptual

### 2. Wire font injection into `compile`
- `resolveAndCacheFont` → `@font-face` block prepended to CSS
- Expected score jump: **+5–10%** geometry + perceptual

### 3. Run benchmark gate once scores improve
```powershell
node apps/cli/dist/index.js benchmark --suite phase2 --gate --fixtures benchmark/frames
```

### 4. Add `medium` and `complex` benchmark fixtures
- Need 2 more Figma frame URLs (medium and complex complexity)

---

## 📁 Key Files

| File | Purpose |
|---|---|
| [`apps/cli/src/index.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/index.ts) | CLI entry — 5 commands |
| [`apps/cli/src/cmd-parse.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-parse.ts) | parse command |
| [`apps/cli/src/cmd-compile.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-compile.ts) | compile command |
| [`apps/cli/src/cmd-render.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-render.ts) | render command |
| [`apps/cli/src/cmd-compare.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-compare.ts) | compare command |
| [`apps/cli/src/cmd-benchmark.ts`](file:///c:/secondsource/figmatocode/apps/cli/src/cmd-benchmark.ts) | benchmark --gate command |
| [`packages/asset-engine/src/download.ts`](file:///c:/secondsource/figmatocode/packages/asset-engine/src/download.ts) | SHA-256 download + cache |
| [`benchmark/frames/simple/`](file:///c:/secondsource/figmatocode/benchmark/frames/simple/) | First real fixture (Charles Prints hero) |
