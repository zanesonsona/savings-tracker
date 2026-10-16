import { z } from "zod";

// String-union "enums" (§4 SQLite limitation) — keep in sync with lib/types.ts.
export const CATEGORY_KINDS = ["EXPENSE", "SAVINGS"] as const;
export const SAVINGS_DIRECTIONS = ["DEPOSIT", "WITHDRAWAL"] as const;

export const categoryKindSchema = z.enum(CATEGORY_KINDS);
export const savingsDirectionSchema = z.enum(SAVINGS_DIRECTIONS);

const PERCENTAGE_RANGE_ERROR = "Percentage must be between 0 and 100";

export const percentageSchema = z
  .number()
  .min(0, PERCENTAGE_RANGE_ERROR)
  .max(100, PERCENTAGE_RANGE_ERROR)
  .multipleOf(0.01, "Percentage can have at most 2 decimal places");

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(40, "Name must be 40 characters or fewer");

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex value like #ef4444");

/** POST /api/categories body. */
export const categoryCreateSchema = z.object({
  name: categoryNameSchema,
  percentage: percentageSchema,
  kind: categoryKindSchema.default("EXPENSE"),
  color: colorSchema.nullable().optional(),
});

/** PATCH /api/categories/[id] body — at least one field. */
export const categoryUpdateSchema = z
  .object({
    name: categoryNameSchema.optional(),
    percentage: percentageSchema.optional(),
    kind: categoryKindSchema.optional(),
    color: colorSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

/** First zod issue as a human-readable `{ error }` message (§6 error shape). */
export function zodErrorMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
