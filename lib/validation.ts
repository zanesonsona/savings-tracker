import { z } from "zod";
import { parseDate } from "./dates";

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

/** Parse a positive integer id from a route param; null when invalid. */
export function parseIdParam(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// --- Shared request fragments (incomes / expenses / savings) ---

export const moneyAmountSchema = z
  .number()
  .int("Amount must be a whole number of cents")
  .positive("Amount must be greater than zero");

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be formatted as YYYY-MM");

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be formatted as YYYY-MM-DD")
  .refine((value) => {
    try {
      parseDate(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid calendar date");

export const sourceSchema = z
  .string()
  .trim()
  .max(60, "Source must be 60 characters or fewer")
  .optional();

export const noteSchema = z
  .string()
  .trim()
  .max(200, "Note must be 200 characters or fewer")
  .optional();

export const categoryIdSchema = z
  .number()
  .int("Category id must be a whole number")
  .positive("Category id must be greater than zero");

/** POST /api/incomes body. */
export const incomeCreateSchema = z.object({
  amountCents: moneyAmountSchema,
  source: sourceSchema,
  date: dateSchema,
  note: noteSchema,
});

/** POST /api/expenses body. */
export const expenseCreateSchema = z.object({
  amountCents: moneyAmountSchema,
  date: dateSchema,
  categoryId: categoryIdSchema,
  note: noteSchema,
});

/** POST /api/savings body. */
export const savingsCreateSchema = z.object({
  amountCents: moneyAmountSchema,
  direction: savingsDirectionSchema,
  date: dateSchema,
  categoryId: categoryIdSchema,
  note: noteSchema,
});

/** Normalize an optional trimmed string to `string | null`. */
export function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

// --- Auth (T23) ---

/** Allowed username characters: letters, digits, dot, underscore, hyphen. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or fewer")
  .regex(USERNAME_PATTERN, "Username may only contain letters, digits, dots, underscores and hyphens");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password must be 200 characters or fewer");

/** POST /api/auth/register body. */
export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** POST /api/auth/login body — non-empty fields; wrong values → 401. */
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(30, "Username must be 30 characters or fewer"),
  password: z.string().min(1, "Password is required"),
});

// --- Admin user management (T27) ---

/** GET /api/admin/users?status= filter (the route defaults to ALL). */
export const adminUsersStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "ALL"]);
