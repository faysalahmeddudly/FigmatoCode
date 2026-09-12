import { z } from "zod";

// Canonical units per PRD §14.2: CSS pixels for geometry, normalized [0,1] RGBA for colors,
// [0,1] for opacity. No package may silently reinterpret units.
export const RgbaSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1),
});
export type Rgba = z.infer<typeof RgbaSchema>;

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;

// Same shape as Rect but always expressed relative to the immediate parent (PRD §4.4).
export const RelativeRectSchema = RectSchema;
export type RelativeRect = z.infer<typeof RelativeRectSchema>;

export const TransformIRSchema = z.object({
  rotation: z.number().optional(),
  matrix: z
    .tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])
    .optional(),
  origin: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type TransformIR = z.infer<typeof TransformIRSchema>;

export const ConstraintHorizontalSchema = z.enum([
  "LEFT",
  "RIGHT",
  "CENTER",
  "LEFT_RIGHT",
  "SCALE",
  "STRETCH",
  "NONE",
]);
export const ConstraintVerticalSchema = z.enum([
  "TOP",
  "BOTTOM",
  "CENTER",
  "TOP_BOTTOM",
  "SCALE",
  "STRETCH",
  "NONE",
]);

export const ConstraintIRSchema = z.object({
  horizontal: ConstraintHorizontalSchema,
  vertical: ConstraintVerticalSchema,
});
export type ConstraintIR = z.infer<typeof ConstraintIRSchema>;
