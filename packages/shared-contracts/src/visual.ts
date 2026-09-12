import { z } from "zod";
import { RgbaSchema } from "./geometry.js";

// PRD §14.11.2
export const GradientTypeSchema = z.enum(["LINEAR", "RADIAL", "ANGULAR", "DIAMOND"]);
export const GradientIRSchema = z.object({
  type: GradientTypeSchema,
  stops: z.array(z.object({ position: z.number(), color: RgbaSchema })),
  angle: z.number().optional(),
  center: z.object({ x: z.number(), y: z.number() }).optional(),
  radius: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type GradientIR = z.infer<typeof GradientIRSchema>;

// PRD §14.11.3
export const ShadowIRSchema = z.object({
  type: z.enum(["DROP", "INNER"]),
  color: RgbaSchema,
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number(),
  spread: z.number().optional(),
});
export type ShadowIR = z.infer<typeof ShadowIRSchema>;

// PRD §14.2 lists NodeIR.effects?: EffectIR[] alongside shadows; §14.11.3 only spells out
// ShadowIR, so EffectIR is treated as that same shape until a distinct effect type is specified.
export const EffectIRSchema = ShadowIRSchema;
export type EffectIR = z.infer<typeof EffectIRSchema>;

// PRD §14.11.4: object/layer/backdrop blur are distinguished because they composite differently.
export const BlurIRSchema = z.object({
  type: z.enum(["LAYER", "OBJECT", "BACKGROUND"]),
  radius: z.number(),
});
export type BlurIR = z.infer<typeof BlurIRSchema>;

export const FilterIRSchema = z.object({
  type: z.string(),
  value: z.union([z.number(), z.string()]),
});
export type FilterIR = z.infer<typeof FilterIRSchema>;

// PRD §14.11.5
export const CompositingIRSchema = z.object({
  opacity: z.number().min(0).max(1),
  blendMode: z.string(),
  isolation: z.boolean(),
});
export type CompositingIR = z.infer<typeof CompositingIRSchema>;

// PRD §14.11.6
export const ClipIRSchema = z.object({
  type: z.enum(["RECT", "PATH", "RADIUS"]),
  geometry: z.unknown().optional(),
});
export type ClipIR = z.infer<typeof ClipIRSchema>;

export const MaskIRSchema = z.object({
  type: z.enum(["ALPHA", "LUMINANCE", "PATH"]),
  referenceNodeId: z.string().optional(),
});
export type MaskIR = z.infer<typeof MaskIRSchema>;

// PRD §14.11.7
export const StackingIRSchema = z.object({
  position: z.enum(["static", "relative", "absolute", "fixed", "sticky"]),
  zIndex: z.union([z.number(), z.literal("auto")]),
  stackingContext: z.boolean(),
  paintOrder: z.number(),
});
export type StackingIR = z.infer<typeof StackingIRSchema>;

// Per-corner radius; used by NodeIR.radius (PRD §14.6 "Per-corner values when source provides them").
export const RadiusIRSchema = z.object({
  topLeft: z.number(),
  topRight: z.number(),
  bottomRight: z.number(),
  bottomLeft: z.number(),
});
export type RadiusIR = z.infer<typeof RadiusIRSchema>;

// Fill/stroke paint source, referenced from both NodeIR (§14.2) and VisualIR (§14.11.1).
export const PaintIRSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SOLID"), color: RgbaSchema }),
  z.object({ kind: z.literal("GRADIENT"), gradient: GradientIRSchema }),
  z.object({ kind: z.literal("IMAGE"), assetId: z.string() }),
]);
export type PaintIR = z.infer<typeof PaintIRSchema>;

export const FillIRSchema = PaintIRSchema;
export type FillIR = z.infer<typeof FillIRSchema>;

export const StrokeIRSchema = z.object({
  paint: PaintIRSchema,
  width: z.number(),
});
export type StrokeIR = z.infer<typeof StrokeIRSchema>;

// PRD §14.11.1: source-of-truth paint/compositing structure; generated CSS/SVG is derived, never canonical.
export const VisualIRSchema = z.object({
  fills: z.array(FillIRSchema),
  strokes: z.array(StrokeIRSchema),
  gradients: z.array(GradientIRSchema).optional(),
  shadows: z.array(ShadowIRSchema).optional(),
  blur: BlurIRSchema.optional(),
  compositing: CompositingIRSchema.optional(),
  clip: ClipIRSchema.optional(),
  masks: z.array(MaskIRSchema).optional(),
  filters: z.array(FilterIRSchema).optional(),
  radius: RadiusIRSchema.optional(),
  opacity: z.number().min(0).max(1),
});
export type VisualIR = z.infer<typeof VisualIRSchema>;
