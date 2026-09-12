import type { DesignDocument } from "@figma-engine/shared-contracts";

// PRD §16.1 step 3: walk from each affected node to its parent and ancestors.
// Returns [nodeId, parentId, ..., rootId].
export function getAncestorChain(nodeId: string, doc: DesignDocument): string[] {
  const chain: string[] = [];
  let current: string | null = nodeId;
  while (current) {
    chain.push(current);
    current = doc.nodes[current]?.parentId ?? null;
  }
  return chain;
}

// PRD §16.1 step 4: identify the smallest common ancestor that explains the error pattern
// across multiple affected nodes -- e.g. several sibling children all shifted the same way
// usually means the *parent's* gap/padding is the real cause, not each child individually.
export function findSmallestCommonAncestor(
  nodeIds: string[],
  doc: DesignDocument,
): string | undefined {
  if (nodeIds.length === 0) return undefined;

  const chains = nodeIds.map((id) => getAncestorChain(id, doc));
  const [first, ...rest] = chains;
  if (!first) return undefined;

  for (const candidate of first) {
    if (rest.every((chain) => chain.includes(candidate))) {
      return candidate;
    }
  }
  return undefined;
}
