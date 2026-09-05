**# Figma-to-Code Engine — Final Build Roadmap (M0–M10)**

Companion to \`PRD-Figma-to-Code-Engine-FINAL-PRODUCTION-FINAL.docx\` (the authoritative product/architecture contract — this document is a build-sequencing overlay on top of it, not a replacement). Section references (§N) below point into that PRD. Read this file before writing code in this repo; it exists so any contributor — human or AI — can pick up the project's intent without re-deriving it from the PRD's 32 sections each time.

Greenfield build, no existing code. This is a **\*\*deterministic, browser-verified Figma-to-code reverse-engineering compiler\*\*** with a tightly bounded AI escalation layer (Phase 4) — not a Figma-to-React generator, not an LLM wrapper.

\---

**## 0. Confirmed environment & decisions**

\- **\*\*Monorepo\*\***: pnpm workspaces (\`pnpm-workspace.yaml\`), matching \`packages/\*\` + \`apps/\*\` from PRD §26.

\- **\*\*Language\*\***: TypeScript throughout, strict mode, mirroring the PRD's own interface definitions verbatim.

\- **\*\*Installed locally\*\***: Node 24.18, pnpm 11.9, PostgreSQL 18 (\`postgresql-x64-18\`, already running as a service).

\- **\*\*Validation\*\***: Zod for every schema (NodeIR, LayoutIR, VisualIR, DesignIntentProposal, Patch, benchmark manifest) — matches §12A.0 "schema-valid" and §12A.4 "JSON Schema or Zod."

\- **\*\*Rendering\*\***: Playwright, Chromium channel pinned — matches §4.5/§14.10 readiness-gate requirements.

\- **\*\*Visual diff\*\***: pixelmatch + pngjs for §15.2; revisit with an SSIM library only if perceptual-similarity (§15.2 step 7) needs it.

\- **\*\*Secrets\*\***: \`.env\` (gitignored) + dotenv, read once at CLI entry. \`FIGMA\_TOKEN\` and (from M9) \`DATABASE\_URL\` never persisted into IR/logs/artifacts (§24).

\- **\*\*Test runner\*\***: Vitest for unit/integration; Playwright's own runner for golden-visual/E2E where it overlaps with \`renderer\`.

\- **\*\*CLI\*\***: thin \`apps/cli\` using commander, implementing the exact command surface in §20.1.

\- **\*\*No repo host configured yet\*\*** — CI is a local script equivalent (\`pnpm build && pnpm test\` + gate commands) until one is set up.

**### Where PostgreSQL fits (settled)**

The PRD's core contracts (run manifest, reference artifacts, patch log, benchmark reports — §14.1, §22.2) are explicitly file-based, content-addressed, immutable-per-run artifacts. Reproducibility (§8, §19) is defined in terms of hashed files, not database rows.

\- **\*\*M0–M8 (deterministic core): stays filesystem-based, no exceptions.\*\*** Introducing a DB here would mean inventing state the PRD doesn't define.

\- **\*\*Postgres starts at M9\*\***, for the two genuinely relational, cross-run, queryable components: **\*\*ai-evaluation-cache\*\*** (§12A.5/§29.1 — lookup-by-composite-key at scale) and **\*\*human-review-queue\*\*** (§12A.2/§29 — status/assignment tracking, queryable backlog). Both are already named as their own packages in §12A.6, so this is additive, not a contract change.

\- Uses local Postgres via \`DATABASE\_URL\`; each package owns its own schema — not a shared free-for-all database.

\---

**## 1. Effort overlay (planning horizon, not a deadline)**

Sequence and gates matter more than calendar time here. At roughly 12 hrs/week part-time:

\| Milestones | Est. weeks |

\|---|---|

\| M0–M3 (Phase 1: deterministic compiler) | 4–6 |

\| M4–M5 (Phase 2: rule optimizer) | 5–7 |

\| M6–M8 (Phase 3 + 3A: search, responsive, visual/compositing) | 8–10 |

\| M9 (Phase 4: controlled AI escalation) | 4–5 |

\| M10 (production hardening) | 2–3 |

\| **\*\*Total\*\*** | **\*\*\~23–31 weeks (≈5.5–7 months part-time)\*\*** |

First-pass estimates for beam search, patch rollback, and a multi-model router routinely run long. Re-forecast the remainder once M5 actually finishes.

\---

**## 2. Non-negotiable framing (holds across every milestone)**

\- Not a Figma-to-React generator. Is a browser-verified visual reverse-engineering compiler.

\- AI never owns production rendering, source-code authority, or commit authority in any milestone — it may analyze unresolved evidence and propose structured patches; deterministic compilation, Chromium, comparison, optimizer, and rollback decide.

\- Rules → candidate search → AI escalation, last resort, never the reverse.

\- Every optimization is reversible, measurable, scoped, reproducible.

\- Determinism requires all of: source version, browser version, viewport, DPR, font files, assets, generator version, rule version, benchmark configuration.
- **Production architecture lock:** no pre-compiler AI Design Understanding stage is part of the production roadmap. Any “Figma section + PNG + metadata → AI-generated quick code” concept belongs in a separate research harness unless promoted by benchmark evidence and a versioned ADR.

\---

**## 3. Milestone-by-milestone plan**

**### M0 — Repository + contracts + benchmark fixtures**

**\*\*Gate: build/test infra green\*\***

\- Init pnpm workspace: \`package.json\`, \`pnpm-workspace.yaml\`, root \`tsconfig.json\` (project references), \`.gitignore\`, \`.env.example\` (\`FIGMA\_TOKEN\`, later \`DATABASE\_URL\`), ESLint/Prettier, Vitest config, git init + first commit.

\- Scaffold the full \`packages/\*\` tree from §26 — empty \`package.json\` + \`tsconfig\` + \`src/index.ts\` stub per package, so later milestones only fill in logic.

\- \`packages/shared-contracts\`: Zod schemas + inferred TS types for \`NodeIdentity\`, \`Rect\`, \`RelativeRect\`, \`NodeIR\`, \`TransformIR\`, \`ConstraintIR\`, \`LayoutIR\`, \`VisualIR\` (+ Gradient/Shadow/Blur/Filter/Compositing/Clip/Mask/StackingIR), \`Patch\`, run-event schema (§22.1), typed failure-class enum (§21.1, §21.2A). Single source of truth — nothing else redefines these types.

\- Benchmark fixture format (§18.1, §23.1): \`benchmark/frames/{simple,medium,complex}/frame.json\` + \`reference.png\` + \`expected-ir.json\`, \`benchmark/reference-artifacts/\*.json\` per §14.8, \`benchmark/reports/\`, \`benchmark/golden/\`.

\- \`pnpm build && pnpm test\` must pass on the empty scaffold before M1 starts.

**### M1 — Figma extraction + NodeIR**

**\*\*Gate: 3 fixtures parse deterministically\*\***

\- \`packages/figma-client\`: Figma REST API wrapper, token from \`process.env.FIGMA\_TOKEN\` (never logged), bounded retry/backoff on rate limits, typed errors (\`AUTH\_FAILED\`, \`FIGMA\_RATE\_LIMIT\`, \`FIGMA\_UNAVAILABLE\`, \`NODE\_NOT\_FOUND\`) per §21.1. Leave an adapter seam for an optional MCP-based source later (§13.1 — pinned-commit only, not wired by default).

\- \`packages/figma-parser\`: recursive traversal → NodeIR per §14.2 — \`NodeIdentity\` (figmaId/internalId/structureHash), absolute + relative geometry (§4.4) for every node, preserved component/instance metadata as-is (§4.3), hashed/downloaded asset references, LayoutIR/TypographyIR extraction.

\- \`packages/design-ir\`: pure validation/ownership of canonical schemas (imports from shared-contracts) — no heuristics, per its "must not" column in §25.

\- **\*\*Needs from you before this can run for real\*\***: one Figma file key + node ID. Everything else in M0/M1 scaffolding proceeds without it, but real fixtures need it.

**### M2 — HTML/CSS compiler + renderer**

**\*\*Gate: ready screenshot + reproducible run\*\***

\- \`packages/font-engine\`, \`packages/asset-engine\`: font resolve/hash/validate (no silent substitution — hard \`FONT\_MISSING\` per §14.9), asset download/hash/content-addressed local path.

\- \`packages/code-generator\`: deterministic HTML/CSS only (no React/Tailwind/JS) per the §14.6 mapping table — Auto Layout → flex, gap → gap, padding → padding, etc. Deterministic class names from node identity/role, deterministic DOM order.

\- \`packages/renderer\`: Playwright/Chromium wrapper enforcing the readiness precondition (§4.5/§14.10) structurally — \`document.fonts.ready\`, all images loaded, network idle — before any screenshot. One browser process / one reusable context per §5.3 (full candidate isolation logic is M4+, but the reuse contract's shape belongs here).

\- First end-to-end milestone (§11): one 1440×900 frame → HTML/CSS → ready Chromium screenshot, output laid out per §14.1's \`output/\<runId>/\` structure with full manifest/hash provenance.

**### M3 — Geometry + visual comparison**

**\*\*Gate: real score + diff regions\*\***

\- \`packages/geometry-engine\`: per-node dx/dy/dw/dh and relative-diff computation (§15.3).

\- \`packages/visual-engine\`: screenshot normalization (§15.1) → pixel-diff → error mask → region merge → severity/NodeIR ownership → perceptual similarity (§15.2). No CSS generation here (§25.0A boundary).

\- Fidelity Score v1 (§15.4) as a versioned, configurable scoring-profile module; every report records \`scoreProfileId\`.

\- **\*\*Exit\*\***: pipeline runs end-to-end on 3 benchmark frames, real reproducible scores (60–75% expected per §4 — reproducibility/completeness is the gate, not the number).

**### M4 — Root-cause + patch engine**

**\*\*Gate: reversible deterministic patch loop\*\***

\- \`packages/root-cause-engine\`: ancestor-first diagnosis (§16.1) — cluster diff regions → map to nodes → walk ancestors → classify → emit evidence record. Root-cause → unresolved-taxonomy mapping (§16.1A) as one lookup module (ADR-011: no package invents its own routing).

\- \`packages/patch-engine\`: \`Patch\` interface + state machine (§16.2/§16.3) — \`PROPOSED → APPLIED → EVALUATED → COMMITTED/ROLLED\_BACK/REJECTED\`. Patch-based rollback only (forward patch, reverse patch, parent version ref, score before/after) — no full-project snapshots (§5.2, ADR-003).

\- Chromium reuse contract properly wired here: candidate isolation (clear/block/recreate all mutable browser state between candidates) per §5.3/ADR-013 — first milestone evaluating multiple candidates against one committed version.

\- **\*\*Test the context-reset logic explicitly here\*\***, before M6 beam search ever trusts a multi-candidate result (see risk register).

**### M5 — Phase 2 rule optimizer**

**\*\*Gate: ≥90% avg fidelity, zero manual edits\*\***

\- \`packages/optimizer\` (rule-based mode): mutation boundaries exactly per §16.4 (canonical table — supersedes the §5.1 summary) as an explicit policy module, not scattered checks.

\- Score acceptance rules (§15.5) as one gate function every commit path calls: \`scoreAfter > scoreBefore + 0.05 AND no critical regression AND valid candidate AND readiness-gated render\`.

\- Regression log of every patch attempt (§25 deliverable).

\- Machine-checkable: \`figma-engine benchmark --suite phase2 --gate\`.

**### M6 — Phase 3 candidate search**

**\*\*Gate: best-version guarantee + bounded beam search\*\***

\- \`packages/layout-solver\`: type-specific candidate generation (§6.1/§16.5) — width/gap/alignment/height, one hypothesis dimension at a time unless an explicit coupled rule is registered. Deterministic candidate ordering.

\- Optimizer extended with beam search (§16.6): \`beamWidth=3\`, \`maxIterations=20\`, eligibility invariant (only §15.5-eligible candidates enter the beam), tie-break order (Fidelity → Robustness → patch count → lexicographic patch ID).

\- Cache contract (§16.7): \`hash(sourceHash, frameHash, designHash, IRHash, viewport, DPR, fontHash, assetHash, generatorVersion, ruleVersion, scoringProfile, candidatePatch, environmentHash)\`. Filesystem-based (content-addressed), consistent with keeping the deterministic core file-based.

\- "Best version always survives" (§6.2) implemented as the literal loop shape given in the PRD.

**### M7 / M7A — Responsive + dynamic validation, visual/compositing solver**

**\*\*Gate: no unresolved critical responsive failures; visual fixtures pass or explicitly unresolved\*\***

\- \`packages/responsive-engine\`: breakpoints 390/640/768/1024/1280/1440 (§17.1); checks per §17.2 (overflow, collision, unexpected wrap, displacement, container instability, horizontal scroll, aspect ratio).

\- \`packages/flow-engine\`: dynamic-content stress suite (SHORT/NORMAL/LONG/EXTREME, §17.3) — a fix merely hiding content is rejected without reference-backed evidence.

\- \`packages/paint-engine\`, \`compositing-engine\`, \`clipping-engine\`, \`stacking-engine\`, \`effect-engine\`: §14.11's VisualIR/GradientIR/ShadowIR/BlurIR/CompositingIR/ClipIR/MaskIR/StackingIR mappings, each staying inside its §25.0A boundary (visual-engine still owns comparison only). Capability tiers A/B/C (§14.11.8) drive what's attempted vs. routed to \`UNRESOLVED\_RENDERING\`.

\- Visual-complexity benchmark fixtures per §18.0A (gradients, shadows, blur, clip/mask, per-corner radius, opacity overlays, blend modes, SVG, stacking overlap, combined-effect cases).

**### M8 — Phase 3 release gate**

**\*\*Gate: ≥95% primary-breakpoint average on release benchmark\*\***

\- Wire \`figma-engine benchmark --suite phase3 --gate\` (§28.1): fidelity threshold, empty required responsive/visual failure lists, best-version guarantee verified, no protected-region regression.

\- Regression policy (§18.3): every fixed defect becomes a permanent fixture; tolerance-bounded protected-score regression blocks release.

\- **\*\*This is the deterministic-core completion gate — nothing in M9 starts before this passes\*\*** (§2 exit criteria to unlock Phase 4).

**### M9 — Phase 4 controlled AI integration**

**\*\*Gate: unresolved-case-only escalation, no bypass\*\***

\- \`packages/model-adapters\` + \`ai-router\`: \`DesignUnderstandingProvider\`-style interface (§12A.0) generalized to implementation escalation; provider-neutral adapters for Gemini (primary visual analyzer), OpenAI (complex reasoning/disagreement), Claude (secondary reasoning/code review), optional Groq. Routing table from §12A.2 as data, not scattered branching.

\- \`packages/schema-validator\`, \`prompt-registry\`: structured patch contract validation (§12A.3/§29.3) — reject anything that isn't a minimal, evidenced, confidence-bearing patch.

\- \`packages/patch-proposer\`: turns validated AI proposals into \`Patch\` objects flowing through the existing patch-engine state machine — no separate AI-only commit path (§29.4 reuses the deterministic acceptance pipeline).

\- \`packages/ai-evaluation-cache\` **\*\*(Postgres-backed)\*\***: cache by source/frame/viewport/DPR/font/asset/prompt/model hash (§12A.5).

\- \`packages/human-review-queue\` **\*\*(Postgres-backed)\*\***: low-confidence/repeatedly-failing cases, status/assignment tracking.

\- \`packages/design-intent-engine\`, \`vision-analyzer\`: Phase 4 evidence interpretation for unresolved cases only; they do not sit on the deterministic-core critical path and do not become a pre-compiler AI stage.

\- AI invocation budget enforced exactly per §29.1: 1 primary call, 1 fallback, ≤2 disagreement proposals, ≤4 total evaluated candidates, 0.70 low-confidence threshold.

\- **\*\*Exit\*\***: 100% schema validation, zero AI patches bypassing mutation-boundary/Chromium/rollback, Fidelity/Robustness reported separately with full provenance.

**### M10 — Production hardening**

**\*\*Gate: security, observability, limits, reproducibility, release automation\*\***

\- Resource limits (§20.3/§21.3) as configuration, not hardcoded.

\- Full observability: run-event schema (§22.1) emitted at every stage transition; all §22.2 audit artifacts always produced.

\- Security pass against §24: secrets never in logs/IR, generated HTML rendered in isolated context, deny-by-default network during benchmark execution.

\- CLI exit-code contract (§20.2) verified for every typed failure class.

\- Release automation: \`figma-engine benchmark --suite phaseN --gate\` wired into a CI pipeline equivalent (local script until a repo host is configured).

\---

**## 4. Verification approach (applies across all milestones)**

\- Every milestone ends with \`pnpm build && pnpm test\` (unit + integration per §23) and, from M2 onward, an actual CLI invocation (\`figma-engine parse|compile|render|compare\`) against whatever benchmark frames exist at that point — not just type-checking.

\- From M5 onward, \`figma-engine benchmark --suite phaseN --gate\` must exit 0 before the milestone counts as done (§28.1's machine-checkable contract).

\- Golden-visual regression (§23.1): once a defect is fixed, its fixture is added permanently under \`benchmark/golden/\` and re-checked every run.

\---

**## 6. Risk register**

\| Risk | Mitigation |

\|---|---|

\| Scope creep into React/AI before the deterministic core is proven | Hold the M8 gate hard — no M9 package gets real logic before M8 passes |

\| Non-determinism creeping into "deterministic" milestones | Freeze and record all 8 determinism inputs per run; fail loudly on drift, never average it away |

\| Silent approximations passing as fixes | Mutation-boundary and no-silent-approximation rules enforced in code + tests, not just documented |

\| Postgres scope creep beyond M9's two packages | Keep M0–M8 filesystem-only as a hard rule — the moment a deterministic-core package reaches for \`DATABASE\_URL\`, that's a contract violation, not a convenience |

\| Chromium candidate-state leakage between evaluations (ADR-013) | Test the context-reset logic explicitly at M4 before trusting any M6 beam-search result |

\| Solo/part-time time budget vs. genuine scope | Treat each milestone's gate as the real deliverable; the effort overlay in §1 is a horizon, not a deadline |

\---

**## 7. Current status**

\- Repo git-initialized.

\- M0 scaffolding in progress: pnpm workspace root files (\`package.json\`, \`pnpm-workspace.yaml\`, \`tsconfig.base.json\`) and all \`packages/\*\` + \`apps/cli\` stub directories (package.json/tsconfig.json/src/index.ts) have been generated. Not yet done: \`.gitignore\`, \`.env.example\`, ESLint/Prettier config, Vitest config, root \`tsconfig.json\` project references, \`shared-contracts\` real schemas, benchmark fixture directories population, first \`pnpm install\`.

\- **\*\*Blocked on\*\***: a Figma file key + node ID for the first real benchmark fixture (needed starting M1, not before).

**## 8. Immediate next action**

Finish M0: \`.gitignore\`, \`.env.example\`, lint/format/test config, root \`tsconfig.json\` references, then \`pnpm install\` and confirm \`pnpm build && pnpm test\` pass on the empty scaffold. Then populate \`packages/shared-contracts\` with the real Zod schemas. M1 real-data work waits on the Figma file key + node ID.