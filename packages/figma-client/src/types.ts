// Minimal subset of the Figma REST API response shape actually consumed by figma-parser.
// Figma's full node schema is far larger; unmodeled fields pass through via the index
// signature rather than being silently dropped, so figma-parser can still see them.
export interface FigmaApiNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: FigmaApiNode[];
  componentId?: string;
  componentProperties?: Record<string, { value: string | boolean; type: string }>;
  [key: string]: unknown;
}

export interface FigmaFileNodeEntry {
  document: FigmaApiNode;
  components?: Record<string, unknown>;
  componentSets?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

export interface FigmaNodesResponse {
  name: string;
  lastModified: string;
  version: string;
  nodes: Record<string, FigmaFileNodeEntry>;
}

export interface ImageExportResponse {
  err: string | null;
  images: Record<string, string | null>;
}
