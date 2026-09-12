import { describe, expect, it } from "vitest";
import type { Patch } from "@figma-engine/shared-contracts";
import { RegressionLog } from "./regression-log.js";

function patch(): Patch {
  return {
    id: "p1",
    targetNodeId: "n0",
    targetScope: "NODE",
    property: "layout.gap",
    oldValue: 16,
    newValue: 8,
    reason: "test",
    evidence: [],
    scoreBefore: 90,
    scoreAfter: 96,
    parentVersionId: "v0",
    status: "COMMITTED",
  };
}

describe("RegressionLog", () => {
  it("retains every recorded attempt, accepted or not", () => {
    const log = new RegressionLog();
    log.record({ patch: patch(), accepted: true, scoreBefore: 90, scoreAfter: 96 });
    log.record({
      patch: { ...patch(), status: "ROLLED_BACK" },
      accepted: false,
      scoreBefore: 90,
      scoreAfter: 89,
    });

    expect(log.getEntries()).toHaveLength(2);
  });

  it("serializes to one JSON object per line", () => {
    const log = new RegressionLog();
    log.record({ patch: patch(), accepted: true, scoreBefore: 90, scoreAfter: 96 });
    log.record({ patch: patch(), accepted: true, scoreBefore: 96, scoreAfter: 98 });

    const lines = log.toJsonLines().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toMatchObject({ accepted: true, scoreBefore: 90 });
  });
});
