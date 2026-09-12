import type { ResponsiveFailure, ViewportSnapshot } from "./types.js";
import { BASELINE_BREAKPOINT } from "./breakpoints.js";
import {
  checkAspectRatio,
  checkCollision,
  checkContainerInstability,
  checkDisplacement,
  checkHorizontalScroll,
  checkOverflow,
  checkUnexpectedWrap,
} from "./checks.js";

export interface RunResponsiveChecksOptions {
  isScrollContainer?: (nodeId: string) => boolean;
  allowOverlap?: (aId: string, bId: string) => boolean;
  expectedAspectRatios?: Record<string, number>;
}

// PRD §17.2's seven check categories, run across every breakpoint snapshot supplied.
// checkUnexpectedWrap/checkDisplacement need a baseline snapshot to diff against; per
// breakpoints.ts, that's BASELINE_BREAKPOINT (1440) when present, otherwise those two checks
// are skipped rather than guessing at a substitute baseline.
export function runResponsiveChecks(
  snapshots: ViewportSnapshot[],
  options: RunResponsiveChecksOptions = {},
): ResponsiveFailure[] {
  const failures: ResponsiveFailure[] = [];
  const baseline = snapshots.find((s) => s.breakpoint === BASELINE_BREAKPOINT);

  for (const snapshot of snapshots) {
    failures.push(...checkOverflow(snapshot, options.isScrollContainer));
    failures.push(...checkHorizontalScroll(snapshot));
    failures.push(...checkCollision(snapshot, options.allowOverlap));
    failures.push(...checkAspectRatio(snapshot, options.expectedAspectRatios ?? {}));

    if (baseline && snapshot !== baseline) {
      failures.push(...checkUnexpectedWrap(snapshot, baseline));
      failures.push(...checkDisplacement(snapshot, baseline));
    }
  }

  failures.push(...checkContainerInstability(snapshots));

  return failures;
}
