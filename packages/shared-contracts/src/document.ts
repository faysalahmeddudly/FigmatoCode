import { z } from "zod";
import { NodeIRSchema, type NodeIR } from "./node-ir.js";

// Canonical output of any parser stage (Figma or otherwise): a flat, identity-keyed node
// map plus the root's internalId. design-ir validates this shape without knowing where it
// came from, per PRD §25's package boundary (design-ir owns schemas, not extraction logic).
export const DesignDocumentSchema = z.object({
  rootId: z.string(),
  nodes: z.record(z.string(), NodeIRSchema),
});

export interface DesignDocument {
  rootId: string;
  nodes: Record<string, NodeIR>;
}
