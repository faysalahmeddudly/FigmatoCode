// PRD §17.1 primary breakpoint set.
export const BREAKPOINTS = [390, 640, 768, 1024, 1280, 1440] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

// §17.1/§8-style convention: the largest breakpoint is the one the reference frame's own
// geometry was authored against, so it's the natural baseline for cross-breakpoint diffing
// (wrap, displacement, instability) unless a caller has a better authored-width to compare to.
export const BASELINE_BREAKPOINT: Breakpoint = 1440;
