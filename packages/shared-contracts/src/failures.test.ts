import { describe, expect, it } from "vitest";
import {
  ROOT_CAUSE_TO_UNRESOLVED,
  RootCauseClassSchema,
  UnresolvedTaxonomySchema,
} from "./failures.js";

describe("ROOT_CAUSE_TO_UNRESOLVED", () => {
  it("maps every root-cause class per §16.1A", () => {
    for (const rootCause of RootCauseClassSchema.options) {
      const bucket = ROOT_CAUSE_TO_UNRESOLVED[rootCause];
      expect(UnresolvedTaxonomySchema.safeParse(bucket).success).toBe(true);
    }
  });

  it("routes MAPPING to UNRESOLVED_MAPPING", () => {
    expect(ROOT_CAUSE_TO_UNRESOLVED.MAPPING).toBe("UNRESOLVED_MAPPING");
  });
});
