import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { nodeClassName } from "./class-name.js";
import { rgbaToCss } from "./color.js";
import { computeAbsoluteChildSizing, computeChildSizing } from "./compute-sizing.js";

const ALIGN_ITEMS: Record<string, string> = {
  START: "flex-start",
  CENTER: "center",
  END: "flex-end",
  STRETCH: "stretch",
};

const JUSTIFY_CONTENT: Record<string, string> = {
  START: "flex-start",
  CENTER: "center",
  END: "flex-end",
  SPACE_BETWEEN: "space-between",
};

function declarationsToCss(className: string, decl: Record<string, string>): string {
  const body = Object.entries(decl)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join("\n");
  return `.${className} {\n${body}\n}`;
}

// PRD §14.6/§14.7: deterministic CSS derived from LayoutIR/VisualIR, never screenshot-traced.
// Container rules (mode/gap/padding/align/justify) and this node's own sizing-within-parent
// are kept separate concerns, matching the orthogonality fixed in figma-parser's mapLayout.
function containerDeclarations(node: NodeIR): Record<string, string> {
  const decl: Record<string, string> = {};

  if (node.layout.mode === "AUTO_LAYOUT") {
    decl["display"] = "flex";
    decl["flex-direction"] = node.layout.axis === "HORIZONTAL" ? "row" : "column";
    decl["gap"] = `${node.layout.gap ?? 0}px`;
    const p = node.layout.padding;
    if (p) decl["padding"] = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
    if (node.layout.align) decl["align-items"] = ALIGN_ITEMS[node.layout.align] ?? "stretch";
    if (node.layout.justify)
      decl["justify-content"] = JUSTIFY_CONTENT[node.layout.justify] ?? "flex-start";
    if (node.layout.wrap) decl["flex-wrap"] = "wrap";
  } else if (node.children.length > 0) {
    // A non-auto-layout node with children is the containing block for its absolutely
    // positioned children (PRD §14.6 "Absolute child -> position:absolute").
    decl["position"] = "relative";
  }

  return decl;
}

function paintDeclarations(node: NodeIR): Record<string, string> {
  const decl: Record<string, string> = {};

  const solidFill = node.fills?.find((f) => f.kind === "SOLID");
  if (solidFill && solidFill.kind === "SOLID") {
    decl[node.type === "TEXT" ? "color" : "background-color"] = rgbaToCss(solidFill.color);
  }

  const stroke = node.strokes?.[0];
  if (stroke && stroke.paint.kind === "SOLID") {
    decl["border"] = `${stroke.width}px solid ${rgbaToCss(stroke.paint.color)}`;
  }

  if (node.radius) {
    const r = node.radius;
    decl["border-radius"] = `${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px`;
  }

  if (node.opacity !== 1) {
    decl["opacity"] = `${node.opacity}`;
  }

  return decl;
}

function typographyDeclarations(node: NodeIR): Record<string, string> {
  if (!node.typography) return {};
  const t = node.typography;
  const decl: Record<string, string> = {
    "font-family": `"${t.fontFamily}"`,
    "font-weight": `${t.fontWeight}`,
    "font-style": t.fontStyle,
    "font-size": `${t.fontSize}px`,
    margin: "0",
  };
  if (t.lineHeight !== undefined) decl["line-height"] = `${t.lineHeight}px`;
  if (t.letterSpacing !== undefined) decl["letter-spacing"] = `${t.letterSpacing}px`;
  if (t.textAlign) {
    decl["text-align"] =
      t.textAlign.toLowerCase() === "justified" ? "justify" : t.textAlign.toLowerCase();
  }
  return decl;
}

export function generateCss(doc: DesignDocument): string {
  const rules: string[] = [];

  rules.push(
    "html, body { margin: 0; padding: 0; }",
    "* { box-sizing: border-box; }",
    `.${nodeClassName(doc.rootId)} { position: relative; }`,
  );

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (!node.visible) continue;

    const decl: Record<string, string> = {
      ...containerDeclarations(node),
      ...paintDeclarations(node),
      ...typographyDeclarations(node),
    };

    const parent = node.parentId ? doc.nodes[node.parentId] : undefined;
    if (id === doc.rootId) {
      decl["width"] = `${node.absolute.width}px`;
      decl["height"] = `${node.absolute.height}px`;
    } else if (parent) {
      const sizing =
        parent.layout.mode === "AUTO_LAYOUT"
          ? computeChildSizing(node, parent.layout.axis ?? "VERTICAL")
          : computeAbsoluteChildSizing(node);

      if (parent.layout.mode !== "AUTO_LAYOUT") {
        decl["position"] = "absolute";
        decl["left"] = `${node.relative.x}px`;
        decl["top"] = `${node.relative.y}px`;
      }

      for (const [prop, value] of Object.entries(sizing)) {
        // Convert camelCase sizing keys (flexGrow) to kebab-case CSS properties (flex-grow).
        const cssProp = prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        decl[cssProp] = value;
      }
    }

    if (Object.keys(decl).length > 0) {
      rules.push(declarationsToCss(nodeClassName(id), decl));
    }
  }

  return rules.join("\n\n");
}
