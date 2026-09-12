import type { DesignDocument } from "@figma-engine/shared-contracts";
import { nodeClassName } from "./class-name.js";
import { escapeHtml } from "./escape-html.js";

// PRD §14.7: DOM order is deterministic and follows normalized IR order (the children array,
// itself produced by deterministic pre-order traversal in figma-parser).
function renderNode(doc: DesignDocument, id: string, indent: string): string {
  const node = doc.nodes[id];
  if (!node || !node.visible) return "";

  const className = nodeClassName(id);

  if (node.type === "TEXT") {
    const content = node.typography?.content ? escapeHtml(node.typography.content) : "";
    return `${indent}<p class="${className}">${content}</p>`;
  }

  const childrenHtml = node.children
    .map((childId) => renderNode(doc, childId, indent + "  "))
    .filter(Boolean)
    .join("\n");

  if (childrenHtml.length === 0) {
    return `${indent}<div class="${className}"></div>`;
  }

  return `${indent}<div class="${className}">\n${childrenHtml}\n${indent}</div>`;
}

export function generateHtml(doc: DesignDocument, cssHref = "styles.css"): string {
  const body = renderNode(doc, doc.rootId, "    ");
  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    `    <link rel="stylesheet" href="${cssHref}" />`,
    "  </head>",
    "  <body>",
    body,
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}
