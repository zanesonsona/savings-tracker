// Shared DTO types for API payloads (dates are ISO strings once serialized over JSON).
// `kind` / `direction` are plain string unions because SQLite/Prisma has no enums (§4).

export type CategoryKind = "EXPENSE" | "SAVINGS";
export type SavingsDirection = "DEPOSIT" | "WITHDRAWAL";

export interface CategoryDTO {
  id: number;
  name: string;
  percentage: number;
  kind: CategoryKind;
  color: string | null;
  createdAt: string;
  /** Usage counts so the UI can preview delete-blocking (D9). */
  expenseCount: number;
  savingsCount: number;
}

export interface CategoryRefDTO {
  id: number;
  name: string;
  kind: CategoryKind;
  color: string | null;
}

export interface IncomeDTO {
  id: number;
  amountCents: number;
  source: string | null;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface ExpenseDTO {
  id: number;
  amountCents: number;
  date: string;
  note: string | null;
  categoryId: number;
  category: CategoryRefDTO;
  createdAt: string;
}

export interface SavingsEntryDTO {
  id: number;
  amountCents: number;
  direction: SavingsDirection;
  date: string;
  note: string | null;
  categoryId: number;
  category: CategoryRefDTO;
  createdAt: string;
}

export interface SavingsListResponse {
  entries: SavingsEntryDTO[];
  /** All-time net across ALL savings categories (D7). */
  balanceCents: number;
  /** Net (deposits − withdrawals) for the requested month. */
  monthNetCents: number;
}

export interface OverviewCategoryDTO {
  id: number;
  name: string;
  kind: CategoryKind;
  color: string | null;
  percentage: number;
  allocatedCents: number;
  actualCents: number;
  remainingCents: number;
  /** actual / allocated (0 when allocated = 0); can exceed 1 when over budget. */
  progress: number;
}

export interface OverviewResponse {
  month: string;
  incomeTotalCents: number;
  unallocatedCents: number;
  categories: OverviewCategoryDTO[];
  totals: {
    spentCents: number;
    netSavedCents: number;
  };
  savingsBalanceCents: number;
}

export interface ApiError {
  error: string;
}

/** Map a Prisma Category (+ counts) to the JSON DTO shape. */
export function toCategoryDTO(
  category: {
    id: number;
    name: string;
    percentage: number;
    kind: string;
    color: string | null;
    createdAt: Date;
  },
  expenseCount = 0,
  savingsCount = 0,
): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    percentage: category.percentage,
    kind: category.kind as CategoryKind,
    color: category.color,
    createdAt: category.createdAt.toISOString(),
    expenseCount,
    savingsCount,
  };
}

/** Map a Prisma Category to the compact reference shape embedded in entry DTOs. */
export function toCategoryRefDTO(category: {
  id: number;
  name: string;
  kind: string;
  color: string | null;
}): CategoryRefDTO {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind as CategoryKind,
    color: category.color,
  };
}
