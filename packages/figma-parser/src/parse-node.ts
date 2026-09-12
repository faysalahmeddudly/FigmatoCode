import { createHash } from "node:crypto";
import type { FigmaApiNode } from "@figma-engine/figma-client";
import type { NodeIR, Rect, TypographyIR } from "@figma-engine/shared-contracts";
import { mapNodeType } from "./map-node-type.js";
import { mapLayout } from "./map-layout.js";
import { mapPaints } from "./map-paint.js";

export interface ParsedDocument {
  rootId: string;
  nodes: Record<string, NodeIR>;
}

export interface ParseContext {
  figmaFileVersion: string;
  parserVersion: string;
}

function structureHash(figmaType: string, childFigmaIds: string[]): string {
  return createHash("sha256")
    .update(`${figmaType}:${childFigmaIds.join(",")}`)
    .digest("hex");
}

function relativeRect(absolute: Rect, parentAbsolute: Rect | null): Rect {
  if (!parentAbsolute) return { ...absolute };
  return {
    x: absolute.x - parentAbsolute.x,
    y: absolute.y - parentAbsolute.y,
    width: absolute.width,
    height: absolute.height,
  };
}

function extractTypography(node: FigmaApiNode): TypographyIR | undefined {
  if (node.type !== "TEXT") return undefined;
  const style = node.style as
    | {
        fontFamily?: string;
        fontWeight?: number;
        italic?: boolean;
        fontSize?: number;
        lineHeightPx?: number;
        letterSpacing?: number;
        textAlignHorizontal?: string;
      }
    | undefined;
  if (!style?.fontFamily || style.fontSize === undefined) return undefined;

  return {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight ?? 400,
    fontStyle: style.italic ? "italic" : "normal",
    fontSize: style.fontSize,
    lineHeight: style.lineHeightPx,
    letterSpacing: style.letterSpacing,
    textAlign: style.textAlignHorizontal as TypographyIR["textAlign"],
    content: typeof node.characters === "string" ? node.characters : undefined,
  };
}

// PRD §4.2/§4.4: every node gets a stable identity and both absolute and parent-relative
// geometry from the very first parse. Traversal order is deterministic (pre-order DFS over
// Figma's own child order), so internalId assignment is reproducible for a fixed source tree.
export function parseDocument(root: FigmaApiNode, context: ParseContext): ParsedDocument {
  const nodes: Record<string, NodeIR> = {};
  let counter = 0;

  function visit(node: FigmaApiNode, parentId: string | null, parentAbsolute: Rect | null): string {
    const internalId = `n${counter++}`;
    const absolute: Rect = node.absoluteBoundingBox
      ? { ...node.absoluteBoundingBox }
      : { x: 0, y: 0, width: 0, height: 0 };
    const relative = relativeRect(absolute, parentAbsolute);
    const childFigmaIds = (node.children ?? []).map((child) => child.id);

    const childIds = (node.children ?? []).map((child) => visit(child, internalId, absolute));

    const fills = mapPaints(node.fills);
    const strokes = node.strokes
      ? mapPaints(node.strokes).map((paint) => ({
          paint,
          width: (node.strokeWeight as number) ?? 1,
        }))
      : undefined;

    nodes[internalId] = {
      identity: {
        figmaId: node.id,
        internalId,
        structureHash: structureHash(node.type, childFigmaIds),
      },
      type: mapNodeType(node.id, node.type),
      name: node.name,
      parentId,
      children: childIds,
      absolute,
      relative,
      visible: node.visible ?? true,
      opacity: typeof node.opacity === "number" ? node.opacity : 1,
      layout: mapLayout(node),
      typography: extractTypography(node),
      fills: fills.length > 0 ? fills : undefined,
      strokes,
      component: node.componentId ? { instanceOfComponentId: node.componentId } : undefined,
      source: {
        figmaNodeType: node.type,
        figmaFileVersion: context.figmaFileVersion,
        parserVersion: context.parserVersion,
        extractedAt: new Date().toISOString(),
      },
    };

    return internalId;
  }

  const rootId = visit(root, null, null);
  return { rootId, nodes };
}
