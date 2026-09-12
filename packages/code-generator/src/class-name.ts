// PRD §14.7: class names are deterministic, based on internal node identity and role;
// random hashes are forbidden.
export function nodeClassName(internalId: string): string {
  return `n-${internalId}`;
}
