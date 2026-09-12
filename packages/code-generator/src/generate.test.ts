import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { generateHtml } from "./generate-html.js";
import { generateCss } from "./generate-css.js";

function node(overrides: Partial<NodeIR> & Pick<NodeIR, "identity">): NodeIR {
  return {
    type: "FRAME",
    name: "n",
    parentId: null,
    children: [],
    absolute: { x: 0, y: 0, width: 100, height: 100 },
    relative: { x: 0, y: 0, width: 100, height: 100 },
    visible: true,
    opacity: 1,
    layout: { mode: "NONE" },
    source: {
      figmaNodeType: "FRAME",
      figmaFileVersion: "v1",
      parserVersion: "0.0.0",
      extractedAt: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

const doc: DesignDocument = {
  rootId: "n0",
  nodes: {
    n0: node({
      identity: { figmaId: "1:1", internalId: "n0", structureHash: "h" },
      absolute: { x: 0, y: 0, width: 1440, height: 900 },
      relative: { x: 0, y: 0, width: 1440, height: 900 },
      layout: {
        mode: "AUTO_LAYOUT",
        axis: "VERTICAL",
        gap: 24,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
      },
      fills: [{ kind: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
      children: ["n1", "n2"],
    }),
    n1: node({
      identity: { figmaId: "1:2", internalId: "n1", structureHash: "h" },
      parentId: "n0",
      type: "TEXT",
      absolute: { x: 16, y: 16, width: 400, height: 32 },
      relative: { x: 16, y: 16, width: 400, height: 32 },
      layout: { mode: "NONE", sizing: { width: "FILL", height: "HUG" } },
      typography: {
        fontFamily: "Inter",
        fontWeight: 700,
        fontStyle: "normal",
        fontSize: 24,
        content: "Hello",
      },
    }),
    n2: node({
      identity: { figmaId: "1:3", internalId: "n2", structureHash: "h" },
      parentId: "n0",
      absolute: { x: 16, y: 64, width: 200, height: 200 },
      relative: { x: 16, y: 64, width: 200, height: 200 },
      layout: { mode: "NONE" },
      children: ["n3"],
    }),
    n3: node({
      identity: { figmaId: "1:4", internalId: "n3", structureHash: "h" },
      parentId: "n2",
      absolute: { x: 40, y: 88, width: 50, height: 50 },
      relative: { x: 24, y: 24, width: 50, height: 50 },
      layout: { mode: "NONE" },
    }),
  },
};

describe("generateHtml", () => {
  it("renders deterministic nested markup in IR child order", () => {
    const html = generateHtml(doc);
    expect(html).toContain('<div class="n-n0">');
    expect(html).toContain('<p class="n-n1">Hello</p>');
    expect(html).toContain('<div class="n-n2">');
    expect(html).toContain('<div class="n-n3"></div>');
    expect(html.indexOf('class="n-n1"')).toBeLessThan(html.indexOf('class="n-n2"'));
  });

  it("escapes text content", () => {
    const withHtml: DesignDocument = {
      rootId: "n1",
      nodes: {
        n1: {
          ...doc.nodes["n1"]!,
          parentId: null,
          typography: { ...doc.nodes["n1"]!.typography!, content: "<script>bad</script>" },
        },
      },
    };
    const html = generateHtml(withHtml);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("generateCss", () => {
  const css = generateCss(doc);

  it("emits flex declarations for the AUTO_LAYOUT root", () => {
    expect(css).toMatch(/\.n-n0 \{[^}]*display: flex;/s);
    expect(css).toMatch(/\.n-n0 \{[^}]*flex-direction: column;/s);
    expect(css).toMatch(/\.n-n0 \{[^}]*gap: 24px;/s);
  });

  it("gives a cross-axis FILL child of a flex parent align-self:stretch, not absolute positioning", () => {
    // n1's parent (n0) is a VERTICAL auto-layout container, so n1's width:FILL is the
    // cross axis -> align-self:stretch (flex-grow would apply to a FILL on the main axis,
    // i.e. height here, which n1 leaves as HUG).
    expect(css).toMatch(/\.n-n1 \{[^}]*align-self: stretch;/s);
    expect(css).not.toMatch(/\.n-n1 \{[^}]*position: absolute;/s);
  });

  it("absolutely positions a child of a non-auto-layout parent using relative geometry", () => {
    expect(css).toMatch(/\.n-n3 \{[^}]*position: absolute;/s);
    expect(css).toMatch(/\.n-n3 \{[^}]*left: 24px;/s);
    expect(css).toMatch(/\.n-n3 \{[^}]*top: 24px;/s);
  });

  it("marks a non-auto-layout parent with children as a positioning context", () => {
    expect(css).toMatch(/\.n-n2 \{[^}]*position: relative;/s);
  });

  it("gives a main-axis FILL child flex-grow", () => {
    const horizontalDoc: DesignDocument = {
      rootId: "row",
      nodes: {
        row: node({
          identity: { figmaId: "1:9", internalId: "row", structureHash: "h" },
          layout: { mode: "AUTO_LAYOUT", axis: "HORIZONTAL", gap: 0 },
          children: ["fillChild"],
        }),
        fillChild: node({
          identity: { figmaId: "1:10", internalId: "fillChild", structureHash: "h" },
          parentId: "row",
          layout: { mode: "NONE", sizing: { width: "FILL", height: "HUG" } },
        }),
      },
    };

    const rowCss = generateCss(horizontalDoc);
    expect(rowCss).toMatch(/\.n-fillChild \{[^}]*flex-grow: 1;/s);
    expect(rowCss).toMatch(/\.n-fillChild \{[^}]*flex-basis: 0;/s);
  });
});
