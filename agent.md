# agent.md — Figma-to-Code Engine
## Read this file before writing a single line of code in this repo.

> **Authoritative sources**: `planning.md` (build-sequencing overlay) + `PRD-Figma-to-Code-Engine-FINAL-PRODUCTION-FINAL.docx` v7 (product/architecture contract).  
> This file is a **synthesised, agent-ready digest** of both. When anything conflicts with the PRD, the PRD wins.

---

## 1. What This Project Is (and Is Not)

| IS | IS NOT |
|---|---|
| A **browser-verified visual reverse-engineering compiler** | A Figma-to-React generator |
| Deterministic, debuggable, measurable output | An LLM wrapper |
| Iterative optimizer driven by real Chromium renders | A screenshot-tracing trick factory |
| AI as a **last-resort, bounded escalation layer** | AI as the primary renderer or decision-maker |

**Lock-in rule #1** — The engine must never assume Figma geometry directly equals CSS implementation. It must preserve observed geometry, infer implementation intent, evaluate in Chromium, and accept only validated improvements.

**Lock-in rule #2** — Every optimization is reversible, measurable, scoped, and reproducible.

**Production architecture lock** — No pre-compiler AI Design Understanding stage. Any "Figma section + PNG → AI quick code" concept belongs in a separate research harness, not this pipeline.

---

## 2. Non-Negotiable Rules (Every Milestone, Every File)

1. **AI never owns rendering, source-code authority, or commit authority** at any milestone.
2. The order is always: **Rules → Candidate Search → AI Escalation**. Never reversed.
3. **No silent approximations.** Unsupported Figma features become explicit typed unresolved cases, never quietly replaced by `position: absolute`, arbitrary `z-index`, `overflow: hidden`, or DOM rewrites.
4. **Determinism requires all 8 inputs frozen**: source version · browser version · viewport · DPR · font files · assets · generator version · rule version. Any drift = result is non-comparable, logged as failure.
5. **Fidelity and Robustness are always reported separately.** Never averaged into one number.
6. **Patch-based rollback only.** No full-project snapshots per candidate (ADR-003).
7. **Chromium measurement is the authoritative acceptance mechanism** (ADR-001). Nothing commits without a browser-measured score delta.
8. **Historical benchmark results stay tied to their scoring profile.** (ADR-010). Never retroactively re-score.
9. **No package invents its own root-cause routing.** All root-cause → unresolved taxonomy mappings flow through the normative §16.1A table only (ADR-011).
10. **M0–M8 is filesystem-based, no database.** The moment a deterministic-core package reaches for `DATABASE_URL`, that is a contract violation (not a convenience).

---

## 3. Environment (Already Confirmed)

| Item | Value |
|---|---|
| Monorepo | pnpm workspaces (`pnpm-workspace.yaml`) |
| Language | TypeScript, strict mode throughout |
| Node | 24.18 |
| pnpm | 11.9 |
| PostgreSQL | 18 (local service — starts at **M9 only**) |
| Schema validation | Zod for every schema (NodeIR, LayoutIR, VisualIR, Patch, benchmarks) |
| Rendering | Playwright, Chromium channel pinned |
| Visual diff | pixelmatch + pngjs (SSIM only if perceptual similarity needs it) |
| Secrets | `.env` (gitignored) + dotenv — `FIGMA_TOKEN`, `DATABASE_URL` never in logs/IR |
| Test runner | Vitest (unit/integration) + Playwright runner (golden/E2E) |
| CLI | `apps/cli` — commander, implements exact §20.1 command surface |

---

## 4. Full Package Map

### Phase 1–3 Deterministic Core (`packages/`)

| Package | Responsibility | Must NOT do |
|---|---|---|
| `shared-contracts` | Own versioned cross-package types and Zod schemas | Contain business heuristics |
| `figma-client` | Retrieve immutable source data via Figma REST API | Generate code or modify source |
| `figma-parser` | Recursive traversal → NodeIR | Render or score |
| `design-ir` | Own canonical schemas/validation | Contain optimizer heuristics |
| `font-engine` | Resolve, hash, validate fonts | Silently substitute fonts |
| `asset-engine` | Download, hash, validate, cache assets | Embed uncontrolled external assets |
| `code-generator` | Generate deterministic HTML/CSS | Call AI or mutate source directly |
| `renderer` | Launch/reuse Chromium; capture readiness-gated renders | Change generated source semantics |
| `geometry-engine` | Compute/match geometry (absolute + relative) | Make code changes |
| `visual-engine` | Compare images → diff regions (must NOT generate CSS) | Patch code |
| `paint-engine` | Normalize fills, gradients, strokes, shadows, paint order | Score renders |
| `compositing-engine` | Normalize opacity, blend mode, isolation, blur, backdrop | Bypass renderer validation |
| `clipping-engine` | Normalize clipping and masks; preserve source semantics | — |
| `stacking-engine` | Stacking contexts, z-index, paint order, overlap diagnostics | Invent layout changes |
| `effect-engine` | Map visual effects → deterministic CSS/SVG/filter; unsupported → typed unresolved | — |
| `root-cause-engine` | Explain diff patterns (ancestor-first diagnosis) | Render candidates |
| `patch-engine` | Apply/reverse validated patches via state machine | Invent unvalidated mutations |
| `optimizer` | Select and evaluate deterministic candidates | Bypass measurement |
| `layout-solver` | Generate bounded, type-specific candidates | Perform arbitrary rewrites |
| `responsive-engine` | Run breakpoint validation (390/640/768/1024/1280/1440) | Hide failures |
| `flow-engine` | Dynamic-content stress tests (SHORT/NORMAL/LONG/EXTREME) | Change source without a patch |
| `benchmark` | Manage fixtures, manifests, reports, gates | Use uncontrolled external data |

### Phase 4 Only — Added AFTER M8 Gate Passes (`packages/`)

`ai-router` · `model-adapters` · `vision-analyzer` · `design-intent-engine` · `patch-proposer` · `schema-validator` · `prompt-registry` · `ai-evaluation-cache` *(Postgres-backed)* · `human-review-queue` *(Postgres-backed)*

> **Do not create real logic in any Phase 4 package before M8 passes.**

---

## 5. Canonical IR Schemas (Single Source of Truth)

All types live in `packages/shared-contracts`. No other package redefines them.

### NodeIdentity
```ts
interface NodeIdentity {
  figmaId: string;       // stable source identity — never reassigned
  internalId: string;    // logical IR identity
  structureHash: string; // recomputed after every committed structural patch
}
```

**Identity reconciliation rule**: a structural patch must emit a reconciliation record mapping pre→post nodes. Unchanged nodes retain `internalId`. If a logical node cannot be deterministically mapped → reject patch or emit `UNRESOLVED_SOURCE_AMBIGUITY`.

### NodeIR (canonical)
```ts
type NodeType =
  | "DOCUMENT" | "PAGE" | "FRAME" | "GROUP" | "RECTANGLE" | "ELLIPSE"
  | "TEXT" | "VECTOR" | "BOOLEAN" | "IMAGE" | "COMPONENT"
  | "INSTANCE" | "SECTION";

interface NodeIR {
  identity: NodeIdentity;
  type: NodeType;
  name: string;
  parentId: string | null;
  children: string[];
  absolute: Rect;         // final visual verification
  relative: RelativeRect; // diagnosis (parent-relative)
  visible: boolean;
  opacity: number;
  layout: LayoutIR;
  typography?: TypographyIR;
  fills?: FillIR[];
  strokes?: StrokeIR[];
  effects?: EffectIR[];
  radius?: RadiusIR;
  asset?: AssetReference;
  component?: ComponentMetadata;
  source: SourceMetadata;
}
```

> **Units**: CSS pixels for geometry · normalized RGBA for colors · 0–1 for opacity · explicit font-family/weight/style tuples. No package may silently reinterpret units.

### LayoutIR
```ts
interface LayoutIR {
  mode: "NONE" | "AUTO_LAYOUT" | "GRID_LIKE" | "ABSOLUTE";
  axis?: "HORIZONTAL" | "VERTICAL";
  gap?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  align?: "START" | "CENTER" | "END" | "STRETCH";
  justify?: "START" | "CENTER" | "END" | "SPACE_BETWEEN";
  sizing?: { width: "FIXED" | "HUG" | "FILL"; height: "FIXED" | "HUG" | "FILL" };
  wrap?: boolean;
  minWidth?: number; maxWidth?: number;
  minHeight?: number; maxHeight?: number;
  aspectRatio?: number;
}
```

### VisualIR
```ts
interface VisualIR {
  fills: FillIR[];
  strokes: StrokeIR[];
  gradients?: GradientIR[];
  shadows?: ShadowIR[];
  blur?: BlurIR;
  compositing?: CompositingIR;
  clip?: ClipIR;
  masks?: MaskIR[];
  filters?: FilterIR[];
  radius?: RadiusIR;
  opacity: number;
}
```

VisualIR is the **source-of-truth structure**. Generated CSS/SVG is a derived representation and must not become canonical state.

### Supporting IR types
```ts
interface GradientIR    { type: "LINEAR"|"RADIAL"|"ANGULAR"|"DIAMOND"; stops: {position:number;color:RGBA}[]; angle?:number; center?:{x:number;y:number}; radius?:{x:number;y:number}; }
interface ShadowIR      { type: "DROP"|"INNER"; color:RGBA; offsetX:number; offsetY:number; blur:number; spread?:number; }
interface BlurIR        { type: "LAYER"|"OBJECT"|"BACKGROUND"; radius:number; }
interface FilterIR      { type: string; value: number|string; }
interface CompositingIR { opacity:number; blendMode:string; isolation:boolean; }
interface ClipIR        { type: "RECT"|"PATH"|"RADIUS"; geometry?: unknown; }
interface MaskIR        { type: "ALPHA"|"LUMINANCE"|"PATH"; referenceNodeId?: string; }
interface StackingIR    { position: "static"|"relative"|"absolute"|"fixed"|"sticky"; zIndex: number|"auto"; stackingContext:boolean; paintOrder:number; }
interface TransformIR   { rotation?:number; matrix?:[number,number,number,number,number,number]; origin?:{x:number;y:number}; }
interface ConstraintIR  { horizontal: "LEFT"|"RIGHT"|"CENTER"|"LEFT_RIGHT"|"SCALE"|"STRETCH"|"NONE"; vertical: "TOP"|"BOTTOM"|"CENTER"|"TOP_BOTTOM"|"SCALE"|"STRETCH"|"NONE"; }
```

### Patch
```ts
interface Patch {
  id: string;
  targetNodeId: string;
  targetScope: "NODE" | "PARENT" | "ANCESTOR";
  property: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  evidence: Evidence[];
  scoreBefore: number;
  scoreAfter?: number;
  robustnessBefore?: number;
  robustnessAfter?: number;
  parentVersionId: string;
  status: "PROPOSED"|"APPLIED"|"EVALUATED"|"COMMITTED"|"ROLLED_BACK"|"REJECTED";
}
```

**Patch state machine**:
```
PROPOSED → APPLIED → EVALUATED
EVALUATED → COMMITTED       (acceptance rules pass)
EVALUATED → ROLLED_BACK     (score/regression rules fail)
PROPOSED  → REJECTED        (schema/boundary validation fails)
APPLIED   → ROLLED_BACK     (runtime/render failure)
```

---

## 6. Figma → HTML/CSS Mapping Rules

| Observed intent | Default implementation | Escalation condition |
|---|---|---|
| Horizontal Auto Layout | `flex row` | Only if evidence indicates grid/other |
| Vertical Auto Layout | `flex column` | Only if evidence indicates grid/other |
| Auto Layout gap | `gap` | Never emulate with arbitrary transforms |
| Padding | `padding` | Side-specific when asymmetric |
| Hug contents | auto intrinsic sizing | Fallback only with measured evidence |
| Fill container | `flex:1` / `width:100%` depending on axis | Must preserve measured geometry |
| Fixed size | fixed px | Candidate solver relaxes only within mutation rules |
| Center alignment | `align-items` / `justify-content: center` | Choose axis from parent layout intent |
| Absolute child | `position: absolute` | Only when source evidence supports it |
| Corner radius | `border-radius` | Per-corner when source provides them |
| Gradient fill | `GradientIR` → deterministic CSS gradient | Bounded angle/stop candidates only |
| Shadow/effect | `ShadowIR/EffectIR` → CSS shadow/filter | Bounded params; unsupported → unresolved |
| Clip/mask | `ClipIR/MaskIR` → clip-path/mask/SVG/overflow | Only with equivalent source semantics |
| Opacity/blend | `CompositingIR` → opacity/mix-blend-mode/isolation | Compositing regressions block commit |
| Transform/rotation | `TransformIR` → CSS transform | Only source-supported; never arbitrary visual tracing |
| Figma constraints | `ConstraintIR` → responsive CSS/layout rules | Must pass all required breakpoints |

> The generator must **prefer semantic layout primitives** over screenshot-tracing tricks. Visually matching but violating source layout intent is **not** considered correct.

---

## 7. Mutation Boundaries (Normative — §16.4 Governs)

| Class | Properties / mutations | Required condition |
|---|---|---|
| **Allowed** | `padding`, `gap`, `width`, `max-width`, `height`, `line-height`, `min-width`, `min-height`, `margin`, `align-items`, `justify-content`, flex sizing; bounded gradient angle/stop, shadow blur/offset/spread, opacity | Source-supported or bounded param; must pass §15.5 + responsive validation |
| **Conditionally allowed** | layout mode, component boundary, DOM structure, content, asset source; z-index alternatives, blend/isolation, transform values | Strong source/evidence required; smallest scope; protected-region + responsive validation required |
| **Restricted** | stacking-context creation, DOM paint-order changes, clip/mask strategy changes, effect-type changes, asset substitution | Source semantics require it; deterministic evidence isolates it; protected-region validation mandatory |
| **Forbidden** | random absolute positioning, arbitrary transforms, arbitrary z-index, arbitrary blend-mode/clip/mask injection, full-tree rewrites | Never as screenshot-tracing fixes. Any exception requires a versioned rule/ADR with source evidence |

---

## 8. Fidelity Score v1

```
Fidelity = 0.20 × Geometry
         + 0.20 × Layout
         + 0.15 × Typography
         + 0.15 × Style
         + 0.10 × Assets
         + 0.20 × Perceptual
```

- Each component normalised to [0, 100]. Final score rounded to 2 decimals.
- **Weights are benchmark-calibratable** — change only by incrementing the scoring-profile version with benchmark justification.
- Every report records `scoreProfileId`. Historical results remain tied to the profile that produced them.

### Score Acceptance Rule (§15.5)
A candidate is eligible for commit **only** when all four conditions hold:
```
scoreAfter > scoreBefore + 0.05
AND no critical regression
AND candidate is valid
AND render completed under readiness contract
```
Critical regression = any hard responsive failure, missing required asset/font, invalid DOM mapping, or material degradation in a protected region.

### Robustness Score (§15.6)
Reported separately. **Never merged into Fidelity.** Hard failures for: overflow violations · collision violations · unexpected text wrap · container instability · horizontal scroll · broken aspect ratio · dynamic content violations.

---

## 9. Root-Cause → Unresolved Taxonomy (Normative §16.1A)

| Root-cause classes | Unresolved bucket | Notes |
|---|---|---|
| POSITION · SIZE · GAP · PADDING · ALIGNMENT · CONSTRAINT · CONTENT_FLOW | `UNRESOLVED_LAYOUT` | Validate across required breakpoints |
| TYPOGRAPHY | `UNRESOLVED_TYPOGRAPHY` | Font, metrics, wrapping, line-height, weight/style |
| ASSET | `UNRESOLVED_ASSET` | Missing, ambiguous, corrupt, substituted |
| PAINT · GRADIENT · SHADOW · BLUR · CLIP_MASK · COMPOSITING · STACKING · TRANSFORM | `UNRESOLVED_RENDERING` | Deterministic diagnosis first; AI for narrow hypothesis only |
| RESPONSIVE | `UNRESOLVED_RESPONSIVE` | Cross-viewport or dynamic-flow failures after candidate search |
| MAPPING | `UNRESOLVED_MAPPING` | Source-to-CSS/HTML mapping unclear with present source data |
| UNKNOWN | `UNRESOLVED_SOURCE_AMBIGUITY` | Human review by default; AI may propose with evidence only |

> No package may invent a routing category outside this table (ADR-011).

---

## 10. Beam Search (§16.6)

```
beamWidth    = 3
maxIterations = 20
initialBeam  = [initialVersion]

for each iteration:
  expand each version with deterministic candidates
  cheap-filter using DOM/geometry constraints
  render survivors in Chromium (readiness-gated)
  score survivors
  keep top beamWidth versions ranked by:
    1. higher Fidelity
    2. higher Robustness (Fidelity tie)
    3. lower patch count (both tie)
    4. lexicographically smaller patch ID (final deterministic tiebreaker)

return globally best observed eligible version
```

**Eligibility invariant**: candidates enter the beam **only after §15.5 acceptance checks pass**. A higher raw Fidelity cannot outrank an ineligible candidate.

---

## 11. Cache Contract (§16.7)

```ts
cacheKey = hash(
  sourceHash, frameHash, designHash, IRHash,
  viewport, DPR, fontHash, assetHash,
  generatorVersion, ruleVersion, scoringProfile,
  candidatePatch, environmentHash
)
```

- **M0–M8**: filesystem-based, content-addressed.
- **M9+**: `ai-evaluation-cache` (Postgres) adds model/prompt hash dimensions.
- A cache hit is valid **only** when every key component matches exactly.

---

## 12. Responsive & Dynamic Content Rules

### Required breakpoints
`390 / 640 / 768 / 1024 / 1280 / 1440 px`

### Validation rules (all must pass)
- No unexpected horizontal scroll
- No collision between unrelated visible regions
- No unexpected text wrap when reference indicates stable line structure
- No unexpected component displacement beyond configured tolerance
- No unstable container behavior caused by optimizer patches
- No broken aspect ratio where source evidence defines one
- Each breakpoint produces a complete report even when one breakpoint fails

### Dynamic-content stress suite
| Variant | Purpose |
|---|---|
| SHORT | Detects overfitting to minimum content |
| NORMAL | Primary expected-content behavior |
| LONG | Detects clipping, wrap, growth, layout instability |
| EXTREME | Controlled resilience check; never used to justify hiding content |

> A stress-test patch that merely hides content is **rejected** unless reference design demonstrates equivalent clipping/ellipsis behavior.

---

## 13. Visual Feature Capability Tiers (§14.11.8)

| Tier | Meaning |
|---|---|
| **A** | Deterministic CSS/SVG — parameters map directly to a stable browser representation |
| **B** | Bounded approximation — explicitly represented, bounded search space, browser comparison validates improvement |
| **C** | Unresolved — no deterministic equivalent, or source behavior depends on unsupported rendering semantics |

> Tier C must enter the taxonomy as `UNRESOLVED_RENDERING`, `UNRESOLVED_ASSET`, or `UNRESOLVED_SOURCE_AMBIGUITY`. **No hidden screenshot-tracing fallback permitted.**

---

## 14. I/O Contracts

### Input manifest
```json
{
  "figmaFile": "file-key-or-url",
  "nodeId": "123:456",
  "benchmarkId": "dashboard-01",
  "referenceArtifact": "benchmark/reference-artifacts/dashboard-01.json",
  "config": "engine.yaml"
}
```

### Output layout
```
output/<runId>/
  source/
  ir/design-ir.json
  generated/index.html
  generated/styles.css
  generated/assets/
  renders/<viewport>.png
  diffs/<viewport>.png
  reports/run.json
  reports/patches.jsonl
  reports/unresolved.jsonl
  manifest.json
```

> A successful run is **immutable after completion**. Every output file is content-addressed or tied to the run manifest.

### Reference artifact (§14.8)
```json
{
  "schemaVersion": "1.0",
  "frameId": "123:456",
  "viewport": {"width": 1440, "height": 900},
  "dpr": 1,
  "export": {"width": 1440, "height": 900},
  "background": {"mode": "filled", "color": "#FFFFFF"},
  "cropMode": "SCALE",
  "fonts": [{"family": "Inter", "weight": 400, "style": "normal", "sha256": "..."}],
  "assets": [{"sourceId": "img-1", "sha256": "...", "path": "assets/img-1.png"}],
  "referenceImage": "reference.png"
}
```

---

## 15. CLI Contract (§20.1)

```bash
figma-engine parse     --input manifest.json
figma-engine compile   --input manifest.json
figma-engine render    --run <runId>
figma-engine compare   --run <runId>
figma-engine optimize  --run <runId>
figma-engine benchmark --suite phase1|phase2|phase3|phase4 [--gate]
figma-engine report    --run <runId>
```

### Exit codes (§20.2)
| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General failure |
| 2 | Invalid input |
| 3 | Authentication failure |
| 4 | Unsupported source feature |
| 5 | Asset/font failure |
| 6 | Rendering failure |
| 7 | Comparison failure |
| 8 | Benchmark gate failure |
| 9 | Resource/time limit exceeded |

### Engine config (`engine.yaml`)
```yaml
engine:
  maxIterations: 20
  scoreImprovementThreshold: 0.05
  protectedRegressionTolerance: 0.10
optimizer:
  beamWidth: 3
  maxCandidatesPerNode: 8
renderer:
  viewportWidth: 1440
  viewportHeight: 900
  dpr: 1
  readinessTimeoutMs: 15000
responsive:
  breakpoints: [390, 640, 768, 1024, 1280, 1440]
limits:
  maxNodes: 10000
  maxDepth: 100
  maxRuntimeSeconds: 300
  maxPatches: 500
```

---

## 16. Typed Failure Classes (§21.1 + §21.2A)

**Core failures**:
`INPUT_INVALID` · `AUTH_FAILED` · `FIGMA_RATE_LIMIT` · `FIGMA_UNAVAILABLE` · `NODE_NOT_FOUND` · `UNSUPPORTED_NODE` · `FONT_MISSING` · `ASSET_MISSING` · `ASSET_CORRUPT` · `RENDER_TIMEOUT` · `BROWSER_CRASH` · `PAGE_NOT_READY` · `DOM_METRICS_FAILED` · `COMPARISON_FAILED` · `PATCH_INVALID` · `PATCH_BOUNDARY_VIOLATION` · `BENCHMARK_GATE_FAILED` · `RESOURCE_LIMIT_EXCEEDED`

**Visual/compositing failures (§21.2A)**:
`GRADIENT_MAPPING_FAILED` · `EFFECT_MAPPING_FAILED` · `BLUR_MAPPING_FAILED` · `MASK_MAPPING_FAILED` · `CLIP_MAPPING_FAILED` · `STACKING_ORDER_MISMATCH` · `UNEXPECTED_OVERLAY` · `UNEXPECTED_COLLISION` · `ABSOLUTE_POSITION_MISMATCH` · `BLEND_MODE_MISMATCH` · `PAINT_ORDER_MISMATCH`

> These are **diagnostic outcomes, not silent fallbacks**. A run may continue with unresolved cases when benchmark policy permits, but release gates must retain the failure and provenance.

---

## 17. Observability — Run Event Schema (§22.1)

```json
{
  "timestamp": "...",
  "runId": "...",
  "stage": "OPTIMIZE",
  "event": "PATCH_EVALUATED",
  "nodeId": "hero-content",
  "patchId": "p-014",
  "scoreBefore": 91.22,
  "scoreAfter": 92.01,
  "robustnessBefore": 88.0,
  "robustnessAfter": 88.0,
  "decision": "COMMITTED",
  "durationMs": 412
}
```

**Required audit artifacts per run**: run manifest · reference artifact · normalized IR · generated source · rendered screenshots · diff masks/regions · patch log · candidate results · benchmark report · unresolved-case log.

---

## 18. Benchmark Structure

```
benchmark/
  frames/
    simple/           # layout + typography + basic assets
      frame.json
      reference.png
      expected-ir.json
    medium/           # nested auto-layout + mixed content + assets
    complex/          # deep nesting + responsive + visual/compositing complexity
  reference-artifacts/
  golden/             # every fixed defect becomes a permanent golden fixture
  reports/
```

**Benchmark manifest**:
```json
{
  "benchmarkId": "dashboard-medium-01",
  "figmaFile": "...",
  "nodeId": "...",
  "referenceArtifact": "...",
  "primaryViewport": {"width": 1440, "height": 900, "dpr": 1},
  "responsiveViewports": [390, 640, 768, 1024, 1280, 1440],
  "targetFidelity": 95,
  "requiredFonts": ["..."],
  "requiredAssets": ["..."],
  "dynamicContentProfile": "standard-v1"
}
```

---

## 19. Milestone Sequence & Gates

| Milestone | Deliverable | Gate |
|---|---|---|
| **M0** | Repo + contracts + benchmark fixtures | `pnpm build && pnpm test` green on empty scaffold |
| **M1** | Figma extraction + NodeIR | 3 fixtures parse deterministically |
| **M2** | HTML/CSS compiler + renderer | Ready Chromium screenshot + reproducible run |
| **M3** | Geometry + visual comparison | Real score + diff regions returned |
| **M4** | Root-cause + patch engine | Reversible deterministic patch loop; **test context-reset logic here** |
| **M5** | Phase 2 rule optimizer | ≥90% avg Fidelity, zero manual edits; `benchmark --suite phase2 --gate` exits 0 |
| **M6** | Phase 3 candidate search | Best-version guarantee + bounded beam search |
| **M7** | Responsive + dynamic validation | No unresolved critical responsive failures on required fixtures |
| **M7A** | Visual/compositing solver | Gradient/effect/stacking/mask/transform/constraint fixtures pass or explicitly unresolved |
| **M8** | Phase 3 release gate | ≥95% primary-breakpoint avg; `benchmark --suite phase3 --gate` exits 0 — **M9 is locked until this passes** |
| **M9** | Phase 4 controlled AI integration | Unresolved-case-only escalation; 100% schema validation; zero AI bypass |
| **M10** | Production hardening | Security · observability · limits · reproducibility · release automation |

### Verification rule (every milestone)
- Always: `pnpm build && pnpm test`
- From M2: also run an actual CLI invocation against benchmark frames
- From M5: `figma-engine benchmark --suite phaseN --gate` must exit 0

---

## 20. Phase 4 AI Contracts (M9 — Reference Until M8 Gate Passes)

### Model routing
| Unresolved type | Primary | Fallback |
|---|---|---|
| `UNRESOLVED_LAYOUT` | Gemini | OpenAI |
| `UNRESOLVED_TYPOGRAPHY` | OpenAI | Claude |
| `UNRESOLVED_ASSET` | Gemini | — |
| `UNRESOLVED_RESPONSIVE` | OpenAI | multi-breakpoint browser validation |
| `UNRESOLVED_MAPPING` | Claude | OpenAI |
| `UNRESOLVED_RENDERING` | deterministic diagnosis first | AI for narrow hypothesis only |
| `UNRESOLVED_SOURCE_AMBIGUITY` | **Human review** | AI with evidence-backed interpretation only |

### AI invocation budget (§29.1)
- max primary-model calls: **1**
- max fallback-model calls: **1**
- max disagreement proposals: **2**
- max total evaluated AI candidates: **4**
- low-confidence threshold: **0.70** → route to human-review-queue
- high-impact disagreement: independent second proposal required

### AI patch schema (§29.3)
```json
{
  "targetNode": "hero-content",
  "property": "gap",
  "oldValue": "16px",
  "newValue": "24px",
  "reason": "Reference spacing exceeds current spacing",
  "evidence": ["diff-region-12", "relative-geometry-gap"],
  "confidence": 0.91,
  "expectedEffect": "increase vertical separation",
  "alternatives": ["20px", "22px"]
}
```

### AI acceptance pipeline (§29.4)
```
AI proposal
  → schema validation (Zod)
  → mutation-boundary validation
  → candidate application
  → font/asset readiness
  → Chromium render
  → Fidelity + Robustness evaluation
  → commit only on improvement without critical regression
  → otherwise rollback/reject
```

### Determinism boundary (ADR-012)
AI proposal generation is **non-deterministic by default**. Only the post-proposal acceptance, validation, scoring, rollback, and release pipeline inherits the deterministic contract. Caching + versioning make accepted/cached proposals reproducible; they do not imply first-call model determinism.

---

## 21. Architecture Decision Records (ADRs)

| ADR | Decision |
|---|---|
| ADR-001 | Chromium measurement is the authoritative acceptance mechanism |
| ADR-002 | Relative geometry for diagnosis; absolute geometry for final verification |
| ADR-003 | Patch-based rollback replaces full-project snapshots |
| ADR-004 | Deterministic candidate search precedes AI escalation |
| ADR-005 | AI cannot directly mutate source or bypass validation |
| ADR-006 | Fidelity and Robustness are separate release metrics |
| ADR-007 | Third-party tools may accelerate retrieval/reference work only when pinned and auditable |
| ADR-008 | Benchmark artifacts and environment are versioned inputs, not incidental metadata |
| ADR-009 | Unsupported source features are explicit failures/unresolved cases, never silent approximations |
| ADR-010 | Historical benchmark results remain tied to their scoring/environment profile |
| ADR-011 | Root-cause classes map to the seven unresolved taxonomy buckets only through §16.1A; no package invents a different routing |
| ADR-012 | Phase 4 AI proposal generation is non-deterministic by default; reproducibility applies only to frozen proposals/caches and the deterministic acceptance pipeline |
| ADR-013 | Candidate isolation includes CSS and all mutable browser state; reused Chromium contexts must clear/block/recreate browser state so candidate evaluations are fully independent |

**Change-control rule**: any change to IR semantics, scoring, patch semantics, candidate ordering, rendering environment, benchmark interpretation, or AI contracts requires a **versioned ADR or schema/rule version bump**.

---

## 22. Sourcing & Third-Party Policy (§13)

| Source | Permitted use | Constraint |
|---|---|---|
| Figma MCP server (official or vetted OSS) | Inside `figma-client` for richer Figma data | Pin to exact commit hash; record hash as determinism input; do not track moving fork |
| Figma MCP in Phase 4 | Pre-populate frozen evidence for escalated unresolved cases **only** | Must NOT give AI open-ended live Figma file access |
| Third-party Figma-to-HTML plugins (e.g. 10xHTML) | Benchmark baseline comparison **only** | Generation logic must NOT be forked into `code-generator` |
| Production design-to-code tools (Builder.io, Figma Make) | Architecture study **only** | No code or proprietary model output copied into this codebase |

---

## 23. Current Status & Immediate Next Action

**Current status**:
- Repo git-initialized.
- pnpm workspace root files generated (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`).
- All `packages/*` + `apps/cli` stub directories scaffolded.
- **Not yet done**: `.gitignore`, `.env.example`, ESLint/Prettier config, Vitest config, root `tsconfig.json` project references, `shared-contracts` real Zod schemas, benchmark fixture directories, first `pnpm install`.
- **Blocked on**: Figma file key + node ID for first real benchmark fixture (needed starting M1).

**Immediate next action — finish M0**:
1. Create `.gitignore` (exclude `node_modules`, `.env`, `output/`, `benchmark/reports/`)
2. Create `.env.example` with `FIGMA_TOKEN=` and `DATABASE_URL=` placeholders
3. Configure ESLint + Prettier
4. Configure Vitest (`vitest.config.ts`)
5. Wire root `tsconfig.json` project references for all packages
6. Run `pnpm install`
7. Confirm `pnpm build && pnpm test` passes on the empty scaffold
8. Populate `packages/shared-contracts` with real Zod schemas (all IR types above)
9. Populate `benchmark/frames/{simple,medium,complex}/` directory structure

M1 real-data work **waits** on the Figma file key + node ID.

---

## 24. Definition of Done (§31)

A phase is implementation-complete **only when all** of the following are true:

- [ ] All required schemas and package contracts are versioned and Zod-validated
- [ ] Benchmark fixtures exist for simple, medium, and complex tiers
- [ ] Deterministic environment is reproducible and recorded with full provenance
- [ ] Unit, integration, golden visual, regression, failure-path, and E2E tests pass
- [ ] No accepted optimizer patch bypasses measurement, mutation boundaries, or rollback
- [ ] Every benchmark result has complete provenance and audit artifacts
- [ ] No manual source edits required between optimization runs
- [ ] Unsupported inputs fail explicitly and appear in the unresolved taxonomy
- [ ] Phase gates are executable through the CLI and return deterministic exit codes
- [ ] Phase 4 AI remains strictly subordinate to the deterministic acceptance system
- [ ] Security, credentials, resource limits, and data-retention rules enforced

### Visual Fidelity Definition of Done (§31.1)
Visual fidelity is not complete unless: geometry/layout · gradients · fills/strokes · shadows/effects · blur · clipping/masking · opacity/blend modes · SVG/vector rendering · transforms/rotation · Figma constraints · stacking/overlay behavior — each either passes dedicated benchmark fixtures or is explicitly classified as unresolved.

For every accepted visual patch, the audit trail must record: source visual feature · target NodeIdentity · before/after render evidence · candidate property · Fidelity/Robustness delta · commit/rollback decision.

---

## 25. M10 — Production Hardening (Full Detail)

**Gate**: security · observability · resource limits · reproducibility · release automation all verified.

M10 starts only after `figma-engine benchmark --suite phase4 --gate` exits 0 (or after Phase 3 gate if Phase 4 is deferred). It is additive hardening — no new IR contracts, no new packages.

### 25.1 Resource limits (§20.3 / §21.3)
Every limit must be **configuration-controlled**, not hardcoded. Enforced limits:

| Limit | Config key | Default |
|---|---|---|
| Max node count | `limits.maxNodes` | 10,000 |
| Max recursion depth | `limits.maxDepth` | 100 |
| Max optimization iterations | `engine.maxIterations` | 20 |
| Max candidates per node | `optimizer.maxCandidatesPerNode` | 8 |
| Max patches per run | `limits.maxPatches` | 500 |
| Max wall-clock runtime | `limits.maxRuntimeSeconds` | 300 |

Resource exhaustion must produce a **typed failure** (`RESOURCE_LIMIT_EXCEEDED`) and a partial diagnostic artifact. It must **never** silently return a lower-quality result as success.

### 25.2 Full observability
- Run-event schema (§22.1) must be emitted at **every stage transition** — not only on patch events.
- All §22.2 audit artifacts must **always** be produced, even on partial/failed runs.
- Required audit artifacts: run manifest · reference artifact · normalized IR · generated source · rendered screenshots · diff masks/regions · patch log · candidate results · benchmark report · unresolved-case log.

### 25.3 Security pass (§24)
Verify all of the following are enforced in code, not just documented:

| Rule | Check |
|---|---|
| `FIGMA_TOKEN`, API keys, cookies, sensitive URLs | Never appear in logs, IR, benchmark artifacts, or generated code |
| Generated HTML/CSS | Rendered in an isolated browser context/container — treated as untrusted content |
| External network access during benchmarks | Deny-by-default; only explicitly declared source retrieval is permitted |
| Temporary source-asset files | Cleaned according to configured retention policy |
| Phase 4 AI evidence packets | Contain only the minimum evidence needed for the specific unresolved case — no open-ended file access |
| Credentials | Provided via environment/secret management; never committed to the repository |

### 25.4 CLI exit-code contract (§20.2)
Run the full exit-code matrix against every typed failure class. Every path in §21.1 and §21.2A must map to a deterministic exit code. No failure class may silently return exit code 0.

### 25.5 Release automation
Wire `figma-engine benchmark --suite phaseN --gate` into a CI pipeline equivalent:
- **Local script** until a remote repo host is configured: `pnpm build && pnpm test && figma-engine benchmark --suite phase3 --gate`
- Gate command returns exit code 0 **only** when all mandatory criteria pass.
- A documented exception to any gate requires an ADR — it cannot silently change the gate command.
- Benchmark results are stored with code, parser, rule, browser, font, asset, and scoring-profile provenance.

---

## 26. Security Contract (§24) — Full Rules

> Already referenced in M10 (§25.3 above). Repeated here as a standalone lookup for any package author.

1. Credentials are provided via environment/secret management and **never committed** to the repository.
2. `FIGMA_TOKEN`, API keys, cookies, and sensitive URLs are excluded from **logs, benchmark artifacts, IR, and generated code**.
3. Generated HTML/CSS is treated as **untrusted content** and rendered in an isolated browser context/container.
4. External network access is **deny-by-default** during benchmark execution except for explicitly required source retrieval.
5. Temporary files containing source assets are cleaned according to the configured retention policy.
6. Any Phase 4 AI service receives **only the minimum evidence** needed for the specific unresolved case — no open-ended live-project mutation authority.

---

## 27. Master Scope & Gap-Control Contract (§32)

### 27.1 Supported Design-Semantics Matrix (§32.1)
Phase 1–3 deterministic scope **explicitly covers**:

geometry · auto-layout · grid-like structures · typography/font readiness · assets · gradients · fills/strokes · shadows/effects · blur classes · opacity · blend/isolation · clipping · masks · SVG/vector · transforms/rotation · stacking/z-index/paint order · Figma constraints · responsive breakpoints · dynamic-content flow · visual regression

Each capability must either have a **deterministic mapping + browser validation** or be **explicitly classified as unresolved**. There is no third option.

### 27.2 No-Silent-Approximation Rule (§32.2)
The implementation may **not** silently replace unsupported or ambiguous Figma semantics with:

- arbitrary `position: absolute`
- arbitrary CSS transforms
- arbitrary `z-index` values
- `overflow: hidden` as a fix
- asset substitution
- DOM rewrites
- fabricated visual effects

Every approximation must be: **source-supported · bounded · versioned · rendered · measured · rollback-safe** — otherwise the case enters the unresolved taxonomy.

### 27.3 Cross-Phase Contract (§32.3)

| Phase | Owns |
|---|---|
| **Phase 1** | Source extraction · canonical IR · deterministic rendering · reference contracts |
| **Phase 2** | Ancestor-first diagnosis · reversible bounded patches |
| **Phase 3** | Deterministic candidate search · visual/compositing solving · responsive/constraint validation · global-best selection |
| **Phase 4** | Unresolved-case interpretation · structured proposals only — **never becomes the renderer of record** |

### 27.4 Release Gate Completeness (§32.4)
A phase **cannot** be declared complete from Fidelity score alone. The required gate must include all applicable:

- correctness
- robustness
- protected-region checks
- unsupported-feature classification
- determinism verification
- audit-trail completeness
- regression criteria

A benchmark result with an unexplained failure, environmental drift, or silent approximation is **not** a valid success.

### 27.5 Engineering Deliverable Boundary (§32.5)
The PRD is the authoritative product/architecture contract. Package-level engineering specifications may define algorithms, data structures, browser APIs, candidate deltas, and implementation mechanics **only when they preserve the PRD contracts**. Any change to semantics, scoring, candidate ordering, mutation boundaries, rendering environment, or AI authority requires a **versioned ADR or schema/rule version bump**.

---

## 28. Effort Overlay (Reference Only — Not a Deadline)

At ~12 hrs/week part-time. Sequence and gates matter more than calendar time.

| Milestones | Est. weeks |
|---|---|
| M0–M3 (Phase 1: deterministic compiler) | 4–6 |
| M4–M5 (Phase 2: rule optimizer) | 5–7 |
| M6–M8 (Phase 3 + 3A: search, responsive, visual/compositing) | 8–10 |
| M9 (Phase 4: controlled AI escalation) | 4–5 |
| M10 (Production hardening) | 2–3 |
| **Total** | **~23–31 weeks (≈5.5–7 months part-time)** |

> Re-forecast the remainder once M5 actually finishes. Beam search, patch rollback, and multi-model router routinely run long in practice.

---

## 29. Risk Register

| Risk | Mitigation |
|---|---|
| Scope creep into React/AI before deterministic core is proven | Hold the M8 gate hard — no M9 package gets real logic before M8 passes |
| Non-determinism creeping into "deterministic" milestones | Freeze and record all 8 determinism inputs per run; fail loudly on drift, never average it away |
| Silent approximations passing as fixes | Mutation-boundary and no-silent-approximation rules enforced in code + tests, not just documented |
| Postgres scope creep beyond M9's two packages | Keep M0–M8 filesystem-only as a hard rule — any deterministic-core package touching `DATABASE_URL` is a contract violation |
| Chromium candidate-state leakage between evaluations (ADR-013) | Test context-reset logic explicitly at M4 before trusting any M6 beam-search result |
| Solo/part-time time budget vs. genuine scope | Treat each milestone's gate as the real deliverable; the effort overlay is a horizon, not a deadline |

---

## 30. Step-by-Step Implementation Guide (M0 → M10)

This section is the concrete build checklist. Follow milestones in order. A gate must be verified before the next milestone starts.

---

### M0 — Repository + Contracts + Benchmark Fixtures
**Gate: `pnpm build && pnpm test` green on the empty scaffold**

**Step 1 — Config files (finish what is missing)**
```
.gitignore          → exclude: node_modules/ .env output/ benchmark/reports/ *.tsbuildinfo
.env.example        → FIGMA_TOKEN=    DATABASE_URL=
vitest.config.ts    → already present — verify it covers packages/*
tsconfig.json       → wire project references for ALL packages (composite: true)
```

**Step 2 — Scaffold every package stub** (if not already done)
Each `packages/<name>/` must have:
```
package.json        → name, version, scripts: { build, test }, main/types pointing to dist
tsconfig.json       → extends ../../tsconfig.base.json, composite: true
src/index.ts        → empty export {}
```
Full package list: `shared-contracts`, `figma-client`, `figma-parser`, `design-ir`, `font-engine`, `asset-engine`, `code-generator`, `renderer`, `geometry-engine`, `visual-engine`, `paint-engine`, `compositing-engine`, `clipping-engine`, `stacking-engine`, `effect-engine`, `root-cause-engine`, `patch-engine`, `optimizer`, `layout-solver`, `responsive-engine`, `flow-engine`, `benchmark`

**Step 3 — Write real Zod schemas in `packages/shared-contracts/src/index.ts`**
Define and export (Zod + inferred TS types):
- `NodeIdentitySchema`, `RectSchema`, `RelativeRectSchema`
- `NodeIRSchema`, `LayoutIRSchema`, `TypographyIRSchema`
- `VisualIRSchema`, `GradientIRSchema`, `ShadowIRSchema`, `BlurIRSchema`, `FilterIRSchema`
- `CompositingIRSchema`, `ClipIRSchema`, `MaskIRSchema`, `StackingIRSchema`
- `TransformIRSchema`, `ConstraintIRSchema`
- `PatchSchema`, `PatchStatusEnum`
- `FailureClassEnum` (all typed errors from §16 and §21)
- `RunEventSchema`
- `ReferenceArtifactSchema`, `BenchmarkManifestSchema`

**Step 4 — Create benchmark directory structure**
```
benchmark/
  frames/
    simple/    → frame.json  reference.png  expected-ir.json
    medium/    → (same structure, empty for now)
    complex/   → (same structure, empty for now)
  reference-artifacts/
  golden/
  reports/
```

**Step 5 — First install + verify**
```bash
pnpm install
pnpm build && pnpm test
```
Both must exit 0. M0 is done only when this passes.

> **Blocked**: real `frame.json` + `reference.png` for fixtures needs a Figma file key + node ID. M0 structure can be created without it; M1 real data waits for it.

---

### M1 — Figma Extraction + NodeIR
**Gate: 3 fixtures parse deterministically**

**`packages/figma-client`**
- Figma REST API wrapper — authenticate via `process.env.FIGMA_TOKEN` only (never log the token)
- Implement bounded retry + exponential backoff for rate limits
- Typed error responses: `AUTH_FAILED`, `FIGMA_RATE_LIMIT`, `FIGMA_UNAVAILABLE`, `NODE_NOT_FOUND`
- Leave an adapter seam for optional MCP-based source (not wired yet — stub interface only)
- Unit tests: mock API responses for all error cases

**`packages/figma-parser`**
- Recursive frame traversal → `NodeIR` for every node
- For every node compute both:
  - `absolute` geometry (x, y, width, height from Figma absolute bounds)
  - `relative` geometry (relative to immediate parent)
- Assign `NodeIdentity`: `figmaId` (from Figma), `internalId` (stable UUID), `structureHash` (hash of type + children order)
- Preserve component/instance metadata as-is on the IR node — do not infer abstraction
- Download and hash every asset reference — map to deterministic local path
- Extract `LayoutIR` and `TypographyIR` from Figma layout/text properties
- Integration test: parse a saved Figma JSON fixture and compare output to `expected-ir.json`

**`packages/design-ir`**
- Import all schemas from `shared-contracts`
- Export a `validate(node: unknown): NodeIR` that throws on schema violation
- No heuristics, no generation — pure validation ownership

**Verify M1 gate:**
```bash
figma-engine parse --input benchmark/frames/simple/frame.json
# Must produce ir/design-ir.json deterministically (run twice, diff the output — must be identical)
```

---

### M2 — HTML/CSS Compiler + Renderer
**Gate: Ready Chromium screenshot + reproducible run**

**`packages/font-engine`**
- Resolve fonts from the reference artifact font list
- Hash each font file (SHA-256); store in content-addressed cache
- If the exact benchmark font is not available → fail with `FONT_MISSING`. Silent substitution is **forbidden**.
- Expose `isFontReady(family, weight, style): boolean` for the renderer readiness check

**`packages/asset-engine`**
- Download each asset referenced in NodeIR
- SHA-256 hash → deterministic local path under `output/<runId>/generated/assets/`
- Corrupt or hash-mismatched assets → terminate run with `ASSET_CORRUPT`
- Cache is content-addressed and immutable per hash

**`packages/code-generator`**
- Input: validated `NodeIR` tree
- Output: `index.html` + `styles.css` (no React, no Tailwind, no client-side JS)
- Apply the §14.6 mapping rules exactly (see §6 of this document)
- Class names derived deterministically from `internalId + role` — random hashes are forbidden
- DOM order follows normalized IR order
- Optimizer patches target the style model — do not rewrite the entire document per patch
- Unit tests: snapshot HTML/CSS output for each benchmark fixture IR

**`packages/renderer`**
- Playwright + Chromium wrapper
- Readiness precondition is structural — not a comment or a timeout:
  ```ts
  await page.waitForFunction(() =>
    document.fonts.ready &&
    [...document.images].every(img => img.complete) &&
    // network idle condition
  );
  // ONLY THEN take screenshot
  ```
- 1 browser process / 1 reusable context (N candidate evaluations later)
- Screenshot saved to `output/<runId>/renders/<viewport>.png`
- Full output directory layout per §14 (manifest.json with all hashes)

**Verify M2 gate:**
```bash
figma-engine compile --input benchmark/frames/simple/frame.json
figma-engine render  --run <runId>
# Must produce a valid screenshot. Run twice — renders must be bit-identical.
```

---

### M3 — Geometry + Visual Comparison
**Gate: Real fidelity score + diff regions**

**`packages/geometry-engine`**
- For each matched node pair (candidate vs reference):
  ```
  dx = candidate.absolute.x  - reference.absolute.x
  dy = candidate.absolute.y  - reference.absolute.y
  dw = candidate.absolute.width  - reference.absolute.width
  dh = candidate.absolute.height - reference.absolute.height

  dxRel = candidate.relative.x - reference.relative.x   ← for diagnosis
  dyRel = candidate.relative.y - reference.relative.y
  ```
- Absolute geometry = final verification metric
- Relative geometry = diagnosis metric (parent-relative, used by root-cause-engine)

**`packages/visual-engine`**
- Normalize reference and candidate to identical pixel dimensions + DPR semantics
- Alpha treatment and background from reference artifact — never inferred
- Visual diff algorithm (9 steps from §15.2):
  1. Validate dimensions + image metadata
  2. Normalize alpha/background per reference artifact
  3. Compute per-pixel color error with anti-alias tolerance (pixelmatch)
  4. Produce binary error mask at configured threshold
  5. Merge nearby error pixels into diff regions
  6. Compute region area, bounding box, severity, nearest NodeIR ownership
  7. Produce perceptual similarity score (pngjs / SSIM if needed)
  8. Persist raw diff artifacts + normalized metrics
  9. Never discard a diff solely because it is difficult to explain
- **Must not generate CSS** — comparison only

**Fidelity Score v1 module** (versioned, configurable scoring profile):
```ts
Fidelity = 0.20*Geometry + 0.20*Layout + 0.15*Typography
         + 0.15*Style    + 0.10*Assets  + 0.20*Perceptual
```
Each component normalized [0,100]. Final score rounded to 2 decimals. Record `scoreProfileId` in every report.

**Robustness score** reported separately — never merged into Fidelity.

**Verify M3 gate:**
```bash
figma-engine compare --run <runId>
# Must return: fidelity score, robustness score, diff regions, per-node geometry deltas
# Run twice — scores must be identical (reproducibility gate, not score target)
```

---

### M4 — Root-Cause + Patch Engine
**Gate: Reversible deterministic patch loop**

**`packages/root-cause-engine`**
Algorithm (ancestor-first diagnosis):
```
1. Cluster nearby diff regions (spatial proximity)
2. Map each region → affected NodeIR nodes
3. Walk from each affected node → parent → ancestors
4. Find smallest common ancestor that explains the error pattern
5. Classify root cause into one of:
   POSITION | SIZE | GAP | PADDING | ALIGNMENT | TYPOGRAPHY |
   PAINT | GRADIENT | SHADOW | BLUR | CLIP_MASK | COMPOSITING |
   STACKING | TRANSFORM | CONSTRAINT | ASSET | CONTENT_FLOW |
   RESPONSIVE | UNKNOWN
6. Emit evidence record: before/after geometry + region coverage
7. Generate only hypotheses permitted by mutation boundaries (§7 of this document)
8. Map root cause → unresolved taxonomy bucket via §16.1A table (ADR-011: no custom routing)
```

**`packages/patch-engine`**
- Implement the `Patch` interface and state machine (see §5 of this document)
- Per-patch storage: forward patch + reverse patch + parent version reference + scoreBefore + scoreAfter
- Apply patch → evaluate → commit or rollback based on §15.5 acceptance rule
- Full-project snapshot per candidate is **forbidden** (ADR-003)

**Chromium reuse + candidate isolation (wire properly here):**
```
Architecture: 1 browser process → 1 reusable context → N candidate evaluations

Before EVERY candidate evaluation:
  - Apply CSS overrides for this candidate
  - On evaluation end:
      Clear: cookies, localStorage, sessionStorage, IndexedDB,
             Cache Storage, service workers, permissions,
             any other mutable browser state
  - Candidate B must NEVER inherit Candidate A state
  - If state reset fails → invalidate the candidate evaluation result
```

> **Critical**: Write an explicit integration test for the context-reset logic HERE. M6 beam search trusts these results — test it before M5 starts.

**Verify M4 gate:**
```bash
figma-engine optimize --run <runId>
# Must: apply a patch, render, score, then rollback cleanly
# Verify: rolled-back state produces bit-identical output to pre-patch state
```

---

### M5 — Phase 2 Rule Optimizer
**Gate: ≥90% avg Fidelity, zero manual edits**

**`packages/optimizer` (rule-based mode)**
- Implement mutation boundaries as an **explicit policy module** (not scattered checks):
  - Allowed: `padding`, `gap`, `width`, `max-width`, `height`, `line-height`, `min-width`, `min-height`, `margin`, `align-items`, `justify-content`, flex sizing; bounded gradient angle/stop, shadow blur/offset/spread, opacity
  - Conditionally allowed: layout mode, DOM structure — requires strong evidence
  - Forbidden: random `position:absolute`, arbitrary transforms, full-tree rewrites
- Implement score acceptance gate as a single function every commit path calls:
  ```ts
  function isEligibleForCommit(patch: Patch): boolean {
    return patch.scoreAfter > patch.scoreBefore + 0.05
      && !hasCriticalRegression(patch)
      && patch.status === 'EVALUATED'
      && renderCompletedUnderReadinessContract(patch);
  }
  ```
- Log every patch attempt (proposed, applied, evaluated, committed/rolled-back) to `reports/patches.jsonl`

**Verify M5 gate:**
```bash
figma-engine benchmark --suite phase2 --gate
# Must exit 0
# Criteria: ≥90% avg Fidelity across full benchmark set, zero manual edits
```

---

### M6 — Phase 3 Candidate Search
**Gate: Best-version guarantee + bounded beam search**

**`packages/layout-solver`**
- Type-specific candidate generation — one hypothesis dimension at a time:
  ```
  Width:     [fixedPx, "100%", "100% + maxWidth", flex-based]
  Gap:       [measured, measured±1, measured±2, measured±4, ...]
  Alignment: [start, center, end, stretch]
  Height:    [auto, fixed, min-height, aspect-ratio]
  ```
- Coupled changes only when an explicit rule registers them
- Candidate ordering is deterministic (no randomness)
- Visual/stacking candidates: gradient angle ± delta, shadow blur/offset/spread ± delta, z-index alternatives

**Optimizer extended with beam search:**
```
beamWidth    = 3
maxIterations = 20
initialBeam  = [initialVersion]

for each iteration:
  for each beam version:
    expand with deterministic candidates
  cheap-filter candidates (DOM/geometry constraint check — no render yet)
  render survivors in Chromium (readiness-gated)
  score survivors (Fidelity + Robustness)
  keep top beamWidth versions ranked:
    1. higher Fidelity
    2. higher Robustness (Fidelity tie)
    3. lower patch count (both tie)
    4. lexicographically smaller patch ID (final deterministic tiebreaker)

return globally best observed eligible version
```

**Eligibility invariant**: §15.5 acceptance gate runs BEFORE beam admission. A higher raw Fidelity cannot outrank an ineligible candidate.

**"Best version always survives" contract:**
```ts
let best = initialVersion;
for (const candidate of allEvaluatedCandidates) {
  if (isEligibleForCommit(candidate) && ranks_better_than(candidate, best)) {
    best = candidate;
  }
}
return best; // globally best eligible version, never an ineligible one
```

**Cache contract (filesystem-based, M0–M8):**
```ts
cacheKey = hash(
  sourceHash, frameHash, designHash, IRHash,
  viewport, DPR, fontHash, assetHash,
  generatorVersion, ruleVersion, scoringProfile,
  candidatePatch, environmentHash
)
// Cache hit valid ONLY when every component matches exactly
```

---

### M7 — Responsive + Dynamic Content Validation
**Gate: No unresolved critical responsive failures on required fixtures**

**`packages/responsive-engine`**
- Required breakpoints: `390 / 640 / 768 / 1024 / 1280 / 1440 px`
- For each breakpoint, validate:
  - No unexpected horizontal scroll
  - No collision between unrelated visible regions
  - No unexpected text wrap (when reference indicates stable line structure)
  - No unexpected component displacement beyond configured tolerance
  - No container instability caused by optimizer patches
  - No broken aspect ratio where source evidence defines one
- Each breakpoint produces a complete report even when one breakpoint fails
- Failures go into `reports/unresolved.jsonl` as `UNRESOLVED_RESPONSIVE`

**`packages/flow-engine`**
- Dynamic content stress suite:
  - `SHORT`: minimum content — detect overfitting
  - `NORMAL`: expected content — primary behavior
  - `LONG`: detect clipping, wrapping, layout instability
  - `EXTREME`: resilience check — **never used to justify hiding content without reference evidence**
- A patch that merely applies `overflow: hidden` to pass a stress test is **rejected** unless the reference design shows equivalent clipping/ellipsis behavior

---

### M7A — Visual / Compositing Solver
**Gate: Gradient/effect/stacking/mask/transform/constraint fixtures pass or explicitly unresolved**

**`packages/paint-engine`**
- Normalize fills, gradients, strokes, shadows, paint order from NodeIR → CSS/SVG
- Must not score renders — comparison is visual-engine's responsibility

**`packages/compositing-engine`**
- Normalize opacity, blend mode, isolation, blur, backdrop blur
- Distinguish: `LAYER` blur vs `OBJECT` blur vs `BACKGROUND` blur — never substitute one for another
- Must not bypass renderer validation

**`packages/clipping-engine`**
- Normalize ClipIR/MaskIR → `clip-path`, CSS masks, SVG clipping, `overflow`
- Only use a clipping method when source semantics support it
- Preserve containment semantics exactly

**`packages/stacking-engine`**
- Compute stacking contexts, z-index, paint order, positioned descendants
- Visual overlap is not considered solved merely because node geometry matches
- Must not invent layout changes

**`packages/effect-engine`**
- Map supported visual effects → deterministic CSS/SVG/filter primitives
- Unsupported effects → typed unresolved case (never silent fallback)
- Tier A: emit directly. Tier B: bounded candidate. Tier C: `UNRESOLVED_RENDERING`

**Visual diff → candidate classification (§17.0A):**
```
Color-field mismatch      → gradient/fill/opacity candidate
Soft halo mismatch        → shadow/blur/filter candidate
Wrong overlap             → stacking/z-index/paint-order candidate
Wrong visible boundary    → clip/mask/radius candidate
Transparent overlay       → opacity/blend/isolation candidate
Vector edge mismatch      → SVG/path/stroke candidate
```

Every visual candidate follows:
```
schema validation → mutation-boundary validation → readiness-gated render
→ Fidelity + Robustness measurement → commit or rollback
```

**Visual complexity benchmark fixtures must include:**
linear/radial gradients · multiple shadows · blur/backdrop blur · clipping/masks · per-corner radius · opacity overlays · blend modes · SVG/vector shapes · stacking overlap · combined-effect cases (two or more effects composited together)

---

### M8 — Phase 3 Release Gate
**Gate: ≥95% primary-breakpoint average — M9 is locked until this passes**

```bash
figma-engine benchmark --suite phase3 --gate
# Must exit 0
```

Full checklist before declaring M8 done:
- [ ] Fidelity ≥95% average at primary breakpoint (1440px) across full benchmark set
- [ ] Required responsive failure list is empty for release fixtures
- [ ] Required visual/compositing failure list is empty for release fixtures
- [ ] Best-version guarantee verified (never an ineligible candidate returned as best)
- [ ] No protected-region stacking/effect regression
- [ ] Every fixed defect has a permanent fixture added under `benchmark/golden/`
- [ ] Any change that lowers a protected benchmark score beyond configured tolerance blocks release
- [ ] Benchmark results stored with code + parser + rule + browser + font + asset + scoring-profile provenance

> **Hard rule**: No M9 package receives real implementation logic before this gate passes.

---

### M9 — Phase 4 Controlled AI Integration
**Gate: Unresolved-case-only escalation, 100% schema validation, zero AI bypass**

> Start this milestone only after M8 gate passes. All Phase 4 packages were stubs — now fill them in.

**`packages/model-adapters`**
- Provider-neutral adapters for: Gemini (primary visual), OpenAI (complex reasoning), Claude (code review/cleanup), Groq (optional low-latency)
- Each adapter implements the same `DesignUnderstandingProvider` interface
- Adapters do not call every model by default — escalate only on routing table match

**`packages/ai-router`**
- Routing table as data (not scattered branching), sourced from §12A.2:
  ```
  UNRESOLVED_LAYOUT       → Gemini  → OpenAI (low confidence fallback)
  UNRESOLVED_TYPOGRAPHY   → OpenAI  → Claude
  UNRESOLVED_ASSET        → Gemini
  UNRESOLVED_RESPONSIVE   → OpenAI  → multi-breakpoint browser validation
  UNRESOLVED_MAPPING      → Claude  → OpenAI
  UNRESOLVED_RENDERING    → deterministic diagnosis first → AI narrow hypothesis only
  UNRESOLVED_SOURCE_AMBIGUITY → human-review-queue (AI only with evidence-backed interpretation)
  ```
- Invocation budget enforced per unresolved case: max 1 primary call, 1 fallback, 2 disagreement proposals, 4 total evaluated AI candidates

**`packages/schema-validator`**
- Validate every AI response against the AI patch Zod schema before any further processing
- Reject anything that is not a minimal, evidenced, confidence-bearing patch
- Anything failing schema validation → status `REJECTED`, log to unresolved log

**`packages/prompt-registry`**
- Version prompts, schemas, adapters, model configuration as production artifacts
- A prompt version change must be recorded like a generator version change (ADR-008)

**`packages/patch-proposer`**
- Turns validated AI proposals into `Patch` objects
- Flows through the existing `patch-engine` state machine — no separate AI-only commit path
- AI patches go through exactly the same acceptance pipeline as deterministic patches:
  ```
  schema validation → mutation-boundary validation → candidate application
  → font/asset readiness → Chromium render → Fidelity + Robustness
  → commit only on improvement without critical regression
  → otherwise rollback/reject
  ```

**`packages/ai-evaluation-cache`** (Postgres-backed)
- Cache key: `hash(sourceHash, frameHash, viewport, DPR, fontHash, assetHash, promptVersion, modelVersion)`
- Cache hit valid only when every key component matches exactly
- Each package owns its own schema — not a shared free-for-all database

**`packages/human-review-queue`** (Postgres-backed)
- Routes: low-confidence cases (confidence < 0.70), repeatedly failing cases
- Fields: case ID, unresolved type, NodeIdentity, status (pending/assigned/resolved), assignee, created/updated timestamps

**`packages/vision-analyzer`** + **`packages/design-intent-engine`**
- Phase 4 evidence interpretation for unresolved cases only
- Do NOT sit on the deterministic-core critical path
- Do NOT become a pre-compiler AI stage
- AI receives only the frozen evidence packet (§29.2):
  ```
  - unresolved case type
  - target NodeIdentity
  - relevant IR subset
  - relative/absolute geometry diff
  - screenshot crop/overlay
  - relevant benchmark/reference metadata
  - attempted deterministic candidates
  - current scores
  ```
  AI does NOT receive open-ended live-project mutation authority.

**AI determinism boundary (ADR-012):**
AI proposal generation is non-deterministic by default. Caching + versioning make accepted/cached proposals reproducible; they do not imply first-call model determinism. Only the post-proposal acceptance, validation, scoring, rollback, and release pipeline inherits the deterministic contract.

**Verify M9 gate:**
```bash
figma-engine benchmark --suite phase4 --gate
# Must exit 0
# Criteria:
#   100% schema validation on AI outputs
#   Zero accepted AI patches that bypassed Chromium measurement or rollback
#   Zero accepted AI patches that violated mutation boundaries
#   Fidelity + Robustness reported separately with model/prompt/patch provenance
```

---

### M10 — Production Hardening
**Gate: Security · Observability · Limits · Reproducibility · Release automation all verified**

**Step 1 — Resource limits as configuration (not hardcoded)**
Verify every limit reads from `engine.yaml` at runtime:
```yaml
limits:
  maxNodes: 10000
  maxDepth: 100
  maxRuntimeSeconds: 300
  maxPatches: 500
engine:
  maxIterations: 20
optimizer:
  maxCandidatesPerNode: 8
```
Resource exhaustion → typed failure `RESOURCE_LIMIT_EXCEEDED` + partial diagnostic artifact. Never silently return a lower-quality result as success.

**Step 2 — Full observability**
- Run-event schema (§22.1) emitted at **every stage transition** (not only patch events):
  ```
  PARSE_STARTED | PARSE_COMPLETED | COMPILE_STARTED | COMPILE_COMPLETED
  RENDER_STARTED | RENDER_COMPLETED | COMPARE_STARTED | COMPARE_COMPLETED
  PATCH_PROPOSED | PATCH_APPLIED | PATCH_EVALUATED | PATCH_COMMITTED | PATCH_ROLLED_BACK
  BENCHMARK_GATE_CHECKED | RUN_COMPLETED | RUN_FAILED
  ```
- All §22.2 audit artifacts must be produced even on failed/partial runs:
  ```
  run manifest · reference artifact · normalized IR · generated source
  rendered screenshots · diff masks/regions · patch log · candidate results
  benchmark report · unresolved-case log
  ```

**Step 3 — Security pass (verify in code, not just documentation)**

| Rule | Verification |
|---|---|
| `FIGMA_TOKEN`, API keys, cookies, sensitive URLs | Grep logs + artifacts — must not appear anywhere |
| Generated HTML/CSS | Rendered in isolated browser context/container |
| Benchmark network access | Deny-by-default; only explicitly declared source retrieval permitted |
| Temporary source-asset files | Deleted per configured retention policy after run |
| Phase 4 AI evidence packets | Contain only minimum evidence for the specific case |
| Credentials | Never committed to repository; sourced from env/secret management only |

**Step 4 — CLI exit-code contract verification**
Run the full exit-code matrix test:
- Every typed failure class in §21.1 and §21.2A must map to a deterministic non-zero exit code
- No failure class may silently return exit code 0
- Verify with failure-path integration tests (missing font, missing asset, API timeout, invalid patch, browser crash, resource limit)

**Step 5 — Release automation**
Wire the full gate chain as a local CI-equivalent script:
```bash
#!/usr/bin/env bash
set -e
pnpm build
pnpm test
figma-engine benchmark --suite phase3 --gate   # or phase4 if Phase 4 is done
echo "Release gate passed"
```
- Gate command returns exit code 0 only when ALL mandatory criteria pass
- Any documented exception to a gate requires an ADR — cannot silently change gate behavior
- Benchmark results stored with full provenance: code + parser + rule + browser + font + asset + scoring-profile version

---

*This file is a living document. Update it when an ADR changes a contract, a milestone gate changes, or the unresolved taxonomy evolves. Do not update it to work around a constraint — change the contract through the ADR process instead.*
