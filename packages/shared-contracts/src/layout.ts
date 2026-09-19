import { z } from "zod";

export const LayoutModeSchema = z.enum(["NONE", "AUTO_LAYOUT", "GRID_LIKE"]);
export const LayoutPositioningSchema = z.enum(["AUTO", "ABSOLUTE"]);
export const LayoutAxisSchema = z.enum(["HORIZONTAL", "VERTICAL"]);
export const LayoutAlignSchema = z.enum(["START", "CENTER", "END", "STRETCH"]);
export const LayoutJustifySchema = z.enum(["START", "CENTER", "END", "SPACE_BETWEEN"]);
export const SizingModeSchema = z.enum(["FIXED", "HUG", "FILL"]);

// Mirrors PRD §14.3 LayoutIR exactly.
export const LayoutIRSchema = z.object({
  mode: LayoutModeSchema,
  positioning: LayoutPositioningSchema.optional(),
  axis: LayoutAxisSchema.optional(),
  gap: z.number().optional(),
  padding: z
    .object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number(),
    })
    .optional(),
  align: LayoutAlignSchema.optional(),
  justify: LayoutJustifySchema.optional(),
  sizing: z
    .object({
      width: SizingModeSchema,
      height: SizingModeSchema,
    })
    .optional(),
  wrap: z.boolean().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
  aspectRatio: z.number().optional(),
});
export type LayoutIR = z.infer<typeof LayoutIRSchema>;
