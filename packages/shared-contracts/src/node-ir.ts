import { z } from "zod";
import { NodeIdentitySchema } from "./identity.js";
import {
  RectSchema,
  RelativeRectSchema,
  TransformIRSchema,
  ConstraintIRSchema,
} from "./geometry.js";
import { LayoutIRSchema } from "./layout.js";
import { FillIRSchema, StrokeIRSchema, RadiusIRSchema, EffectIRSchema } from "./visual.js";

// PRD §14.2
export const NodeTypeSchema = z.enum([
  "DOCUMENT",
  "PAGE",
  "FRAME",
  "GROUP",
  "RECTANGLE",
  "ELLIPSE",
  "TEXT",
  "VECTOR",
  "BOOLEAN",
  "IMAGE",
  "COMPONENT",
  "INSTANCE",
  "SECTION",
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

// Referenced by PRD §14.2 as an optional NodeIR field; PRD §14 units note specifies
// "explicit font-family/weight/style tuples for typography" as the canonical unit convention.
export const TypographyIRSchema = z.object({
  fontFamily: z.string(),
  fontWeight: z.number(),
  fontStyle: z.enum(["normal", "italic"]),
  fontSize: z.number(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  textAlign: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]).optional(),
  content: z.string().optional(),
});
export type TypographyIR = z.infer<typeof TypographyIRSchema>;

// Shape matches the asset entries in the Reference Artifact Contract (PRD §14.8).
export const AssetReferenceSchema = z.object({
  sourceId: z.string(),
  sha256: z.string(),
  path: z.string(),
});
export type AssetReference = z.infer<typeof AssetReferenceSchema>;

// PRD §4.3: component/instance/variant metadata preserved as-is; abstraction inference is Phase 4.
export const ComponentMetadataSchema = z.object({
  componentId: z.string().optional(),
  instanceOfComponentId: z.string().optional(),
  variantProperties: z.record(z.string(), z.string()).optional(),
});
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>;

// PRD §14.4: extraction is versioned by parser version and Figma source version.
export const SourceMetadataSchema = z.object({
  figmaNodeType: z.string(),
  figmaFileVersion: z.string(),
  parserVersion: z.string(),
  extractedAt: z.string(),
});
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>;

// PRD §14.2 canonical NodeIR schema.
export const NodeIRSchema: z.ZodType<NodeIR> = z.lazy(() =>
  z.object({
    identity: NodeIdentitySchema,
    type: NodeTypeSchema,
    name: z.string(),
    parentId: z.string().nullable(),
    children: z.array(z.string()),
    absolute: RectSchema,
    relative: RelativeRectSchema,
    visible: z.boolean(),
    opacity: z.number().min(0).max(1),
    layout: LayoutIRSchema,
    transform: TransformIRSchema.optional(),
    constraints: ConstraintIRSchema.optional(),
    typography: TypographyIRSchema.optional(),
    fills: z.array(FillIRSchema).optional(),
    strokes: z.array(StrokeIRSchema).optional(),
    effects: z.array(EffectIRSchema).optional(),
    radius: RadiusIRSchema.optional(),
    asset: AssetReferenceSchema.optional(),
    component: ComponentMetadataSchema.optional(),
    source: SourceMetadataSchema,
  }),
);

export interface NodeIR {
  identity: z.infer<typeof NodeIdentitySchema>;
  type: NodeType;
  name: string;
  parentId: string | null;
  children: string[];
  absolute: z.infer<typeof RectSchema>;
  relative: z.infer<typeof RelativeRectSchema>;
  visible: boolean;
  opacity: number;
  layout: z.infer<typeof LayoutIRSchema>;
  transform?: z.infer<typeof TransformIRSchema>;
  constraints?: z.infer<typeof ConstraintIRSchema>;
  typography?: TypographyIR;
  fills?: z.infer<typeof FillIRSchema>[];
  strokes?: z.infer<typeof StrokeIRSchema>[];
  effects?: z.infer<typeof EffectIRSchema>[];
  radius?: z.infer<typeof RadiusIRSchema>;
  asset?: AssetReference;
  component?: ComponentMetadata;
  source: SourceMetadata;
}
