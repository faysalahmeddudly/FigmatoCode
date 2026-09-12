import type {
  DesignDocument,
  RootCauseClass,
  UnresolvedTaxonomy,
} from "@figma-engine/shared-contracts";
import { ROOT_CAUSE_TO_UNRESOLVED } from "@figma-engine/shared-contracts";
import { getAncestorChain } from "./ancestors.js";
import { classifyRootCause, type GeometryDiffInput } from "./classify.js";

// Structurally compatible with visual-engine's OwnedDiffRegion.
export interface DiffRegionInput {
  id: number;
  area: number;
  ownerNodeId?: string;
}

export interface RootCauseEvidence {
  nodeId: string;
  ancestorChain: string[];
  rootCause: RootCauseClass;
  unresolvedBucket: UnresolvedTaxonomy;
  geometryDiff?: GeometryDiffInput;
  regionIds: number[];
  regionCoverageArea: number;
}

// PRD §16.1 steps 1-2, 5-6: cluster diff regions (already grouped into regions upstream by
// visual-engine) -> map each region to its owning node (already attached as ownerNodeId) ->
// classify the root cause -> emit an evidence record. ADR-011: routing to the unresolved
// taxonomy goes through §16.1A's normative table only (ROOT_CAUSE_TO_UNRESOLVED), never a
// locally invented mapping.
export function diagnose(
  doc: DesignDocument,
  geometryDiffs: GeometryDiffInput[],
  regions: DiffRegionInput[],
): RootCauseEvidence[] {
  const geometryByNode = new Map(geometryDiffs.map((d) => [d.nodeId, d]));

  const regionsByNode = new Map<string, DiffRegionInput[]>();
  for (const region of regions) {
    if (!region.ownerNodeId) continue;
    const list = regionsByNode.get(region.ownerNodeId) ?? [];
    list.push(region);
    regionsByNode.set(region.ownerNodeId, list);
  }

  const candidateNodeIds = new Set<string>([...geometryByNode.keys(), ...regionsByNode.keys()]);
  const evidence: RootCauseEvidence[] = [];

  for (const nodeId of candidateNodeIds) {
    const node = doc.nodes[nodeId];
    if (!node) continue;

    const diff = geometryByNode.get(nodeId);
    const nodeRegions = regionsByNode.get(nodeId) ?? [];
    const rootCause = classifyRootCause(node, diff);

    evidence.push({
      nodeId,
      ancestorChain: getAncestorChain(nodeId, doc),
      rootCause,
      unresolvedBucket: ROOT_CAUSE_TO_UNRESOLVED[rootCause],
      geometryDiff: diff,
      regionIds: nodeRegions.map((r) => r.id),
      regionCoverageArea: nodeRegions.reduce((sum, r) => sum + r.area, 0),
    });
  }

  return evidence;
}
