import type { Patch } from "@figma-engine/shared-contracts";

export interface PatchAttemptRecord {
  patch: Patch;
  accepted: boolean;
  scoreBefore: number;
  scoreAfter?: number;
}

// PRD §25 optimizer deliverable: "regression log of every patch attempt." Kept as a plain
// append-only collector so every attempt -- accepted or not -- is retained; nothing is
// dropped just because it was rolled back.
export class RegressionLog {
  private readonly entries: PatchAttemptRecord[] = [];

  record(entry: PatchAttemptRecord): void {
    this.entries.push(entry);
  }

  getEntries(): readonly PatchAttemptRecord[] {
    return this.entries;
  }

  // One JSON object per line, matching the §14.1 output layout's reports/patches.jsonl.
  toJsonLines(): string {
    return this.entries.map((entry) => JSON.stringify(entry)).join("\n");
  }
}
