import { z } from "zod";

// PRD §4.2 / §14.2: figmaId is the stable source identity, internalId the logical IR identity.
// structureHash is recomputed after every committed structural patch (PRD §4.2).
export const NodeIdentitySchema = z.object({
  figmaId: z.string(),
  internalId: z.string(),
  structureHash: z.string(),
});
export type NodeIdentity = z.infer<typeof NodeIdentitySchema>;
