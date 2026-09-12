import type { Patch } from "@figma-engine/shared-contracts";

export type MutationTier = "ALLOWED" | "CONDITIONAL" | "RESTRICTED" | "FORBIDDEN";

// PRD §16.4 is the canonical mutation-boundary table (supersedes §5.1's summary). Property
// names are matched by keyword against a patch's dot-path `property` string rather than an
// exhaustive enumeration of every possible NodeIR path, since the table itself is expressed
// in terms of CSS-ish property categories (padding, gap, width, ...), not schema paths.
const ALLOWED_KEYWORDS = [
  "padding",
  "gap",
  "width",
  "height",
  "lineheight",
  "margin",
  "align",
  "justify",
  "opacity",
  "flexgrow",
  "flexshrink",
  "flexbasis",
];

const CONDITIONAL_KEYWORDS = [
  "mode",
  "component",
  "zindex",
  "blendmode",
  "isolation",
  "transform",
  "rotation",
];

const RESTRICTED_KEYWORDS = ["stackingcontext", "paintorder", "clip", "mask", "effect", "asset"];

// Structural/identity fields must never be reached through the patch mutation path at all --
// changing them is a full-tree/DOM rewrite by definition, forbidden by default per §16.4
// ("Not permitted as screenshot-tracing fixes. Any exception requires an explicit versioned
// rule/ADR with source evidence").
const FORBIDDEN_PATHS = ["identity", "type", "children", "parentId", "source"];

export function classifyMutation(property: string): MutationTier {
  const lower = property.toLowerCase();

  if (FORBIDDEN_PATHS.some((p) => property === p || property.startsWith(`${p}.`))) {
    return "FORBIDDEN";
  }
  if (ALLOWED_KEYWORDS.some((k) => lower.includes(k))) return "ALLOWED";
  if (RESTRICTED_KEYWORDS.some((k) => lower.includes(k))) return "RESTRICTED";
  if (CONDITIONAL_KEYWORDS.some((k) => lower.includes(k))) return "CONDITIONAL";

  // An unrecognized property defaults to RESTRICTED (requires evidence), never silently
  // ALLOWED -- an unknown mutation is exactly the case §32.2's no-silent-approximation rule
  // is meant to catch.
  return "RESTRICTED";
}

// PRD §16.4's "Required condition" column, simplified to what patch-engine can check on its
// own: ALLOWED mutations need no extra evidence; CONDITIONAL and RESTRICTED both require at
// least one evidence record backing the change; FORBIDDEN has no exception path here (an
// exception requires a versioned ADR, which is a process outside this function's authority).
export function isMutationPermitted(patch: Patch): boolean {
  const tier = classifyMutation(patch.property);
  if (tier === "FORBIDDEN") return false;
  if (tier === "ALLOWED") return true;
  return patch.evidence.length > 0;
}
