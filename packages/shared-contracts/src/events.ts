import { z } from "zod";
import { PatchStatusSchema } from "./patch.js";

// PRD §22.1 run event schema.
export const RunStageSchema = z.enum([
  "PARSE",
  "COMPILE",
  "RENDER",
  "COMPARE",
  "OPTIMIZE",
  "RESPONSIVE",
  "REPORT",
]);

export const RunEventSchema = z.object({
  timestamp: z.string(),
  runId: z.string(),
  stage: RunStageSchema,
  event: z.string(),
  nodeId: z.string().optional(),
  patchId: z.string().optional(),
  scoreBefore: z.number().optional(),
  scoreAfter: z.number().optional(),
  robustnessBefore: z.number().optional(),
  robustnessAfter: z.number().optional(),
  decision: PatchStatusSchema.optional(),
  durationMs: z.number().optional(),
});
export type RunEvent = z.infer<typeof RunEventSchema>;
