import { z } from "zod";

// PRD §16.2 Patch contract + §16.3 state machine.
export const PatchTargetScopeSchema = z.enum(["NODE", "PARENT", "ANCESTOR"]);
export const PatchStatusSchema = z.enum([
  "PROPOSED",
  "APPLIED",
  "EVALUATED",
  "COMMITTED",
  "ROLLED_BACK",
  "REJECTED",
]);

export const EvidenceSchema = z.object({
  kind: z.string(),
  detail: z.unknown(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const PatchSchema = z.object({
  id: z.string(),
  targetNodeId: z.string(),
  targetScope: PatchTargetScopeSchema,
  property: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  reason: z.string(),
  evidence: z.array(EvidenceSchema),
  scoreBefore: z.number(),
  scoreAfter: z.number().optional(),
  robustnessBefore: z.number().optional(),
  robustnessAfter: z.number().optional(),
  parentVersionId: z.string(),
  status: PatchStatusSchema,
});
export type Patch = z.infer<typeof PatchSchema>;

// PRD §16.3 valid state transitions, expressed as an adjacency map for validation use.
export const PATCH_STATE_TRANSITIONS: Record<
  z.infer<typeof PatchStatusSchema>,
  z.infer<typeof PatchStatusSchema>[]
> = {
  PROPOSED: ["APPLIED", "REJECTED"],
  APPLIED: ["EVALUATED", "ROLLED_BACK"],
  EVALUATED: ["COMMITTED", "ROLLED_BACK"],
  COMMITTED: [],
  ROLLED_BACK: [],
  REJECTED: [],
};
