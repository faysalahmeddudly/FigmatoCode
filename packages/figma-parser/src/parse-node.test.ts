import { describe, expect, it } from "vitest";
import type { FigmaApiNode } from "@figma-engine/figma-client";
import { parseDocument } from "./parse-node.js";
import { UnsupportedNodeError } from "./errors.js";

const fixture: FigmaApiNode = {
  id: "1:1",
  name: "Root Frame",
  type: "FRAME",
  visible: true,
  opacity: 1,
  absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
  layoutMode: "VERTICAL",
  itemSpacing: 24,
  paddingTop: 16,
  paddingLeft: 16,
  paddingRight: 16,
  paddingBottom: 16,
  fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
  children: [
    {
      id: "1:2",
      name: "Heading",
      type: "TEXT",
      absoluteBoundingBox: { x: 16, y: 16, width: 200, height: 32 },
      characters: "Hello",
      style: { fontFamily: "Inter", fontWeight: 700, fontSize: 24, lineHeightPx: 32 },
    },
  ],
};

describe("parseDocument", () => {
  it("assigns deterministic internal ids and relative geometry", () => {
    const { rootId, nodes } = parseDocument(fixture, {
      figmaFileVersion: "v1",
      parserVersion: "0.0.0",
    });

    expect(rootId).toBe("n0");
    expect(nodes["n0"]?.identity.figmaId).toBe("1:1");
    expect(nodes["n1"]?.identity.figmaId).toBe("1:2");
    expect(nodes["n0"]?.children).toEqual(["n1"]);
    expect(nodes["n1"]?.parentId).toBe("n0");

    // Child is at absolute (16,16); parent at (0,0) -> relative should equal absolute here.
    expect(nodes["n1"]?.relative).toEqual({ x: 16, y: 16, width: 200, height: 32 });
  });

  it("maps auto-layout fields into LayoutIR", () => {
    const { rootId, nodes } = parseDocument(fixture, {
      figmaFileVersion: "v1",
      parserVersion: "0.0.0",
    });

    expect(nodes[rootId]?.layout).toMatchObject({
      mode: "AUTO_LAYOUT",
      axis: "VERTICAL",
      gap: 24,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
    });
  });

  it("extracts typography for TEXT nodes", () => {
    const { nodes } = parseDocument(fixture, { figmaFileVersion: "v1", parserVersion: "0.0.0" });
    const heading = nodes["n1"];

    expect(heading?.typography).toMatchObject({
      fontFamily: "Inter",
      fontWeight: 700,
      fontSize: 24,
      content: "Hello",
    });
  });

  it("throws UnsupportedNodeError for unmapped node types", () => {
    const withStar: FigmaApiNode = {
      ...fixture,
      children: [
        {
          id: "1:3",
          name: "Star",
          type: "STAR",
          absoluteBoundingBox: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    };

    expect(() =>
      parseDocument(withStar, { figmaFileVersion: "v1", parserVersion: "0.0.0" }),
    ).toThrow(UnsupportedNodeError);
  });

  it("produces the same structureHash for structurally identical siblings", () => {
    const twoTexts: FigmaApiNode = {
      ...fixture,
      children: [
        {
          id: "1:2",
          name: "A",
          type: "TEXT",
          absoluteBoundingBox: { x: 0, y: 0, width: 1, height: 1 },
        },
        {
          id: "1:4",
          name: "B",
          type: "TEXT",
          absoluteBoundingBox: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    };

    const { nodes } = parseDocument(twoTexts, { figmaFileVersion: "v1", parserVersion: "0.0.0" });
    expect(nodes["n1"]?.identity.structureHash).toBe(nodes["n2"]?.identity.structureHash);
  });
});
