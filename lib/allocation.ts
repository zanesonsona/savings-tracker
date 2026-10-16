export interface AllocationCategory {
  id: number;
  percentage: number;
}

export interface Allocation {
  categoryId: number;
  amountCents: number;
}

export interface SplitResult {
  allocations: Allocation[];
  unallocatedCents: number;
}

/**
 * Split an income across categories using the largest-remainder method
 * (Project_state §7), in whole cents, so that when Σ% = 100 the allocations
 * sum exactly to the income.
 *
 * Percentages are converted to basis points (integer, 2-decimals safe) so all
 * arithmetic outside the final remainder ordering is exact integer math.
 */
export function splitIncome(amountCents: number, categories: AllocationCategory[]): SplitResult {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }

  const bps = categories.map((c) => Math.round(c.percentage * 100));
  const sumBp = bps.reduce((a, b) => a + b, 0);

  // Total cents to hand out (≤ amountCents as long as Σ% ≤ 100).
  const target = Math.floor((amountCents * sumBp) / 10000);

  const exact = bps.map((bp) => (amountCents * bp) / 10000);
  const floors = exact.map((x) => Math.floor(x));
  const remaining = target - floors.reduce((a, b) => a + b, 0);

  // Give the leftover cents to the largest fractional remainders;
  // ties broken by lower category id.
  const order = categories
    .map((_, i) => i)
    .sort((a, b) => {
      const fracA = exact[a] - floors[a];
      const fracB = exact[b] - floors[b];
      if (fracB !== fracA) return fracB - fracA;
      return categories[a].id - categories[b].id;
    });

  const amounts = floors.slice();
  for (let k = 0; k < remaining && k < order.length; k++) {
    amounts[order[k]] += 1;
  }

  return {
    allocations: categories.map((c, i) => ({
      categoryId: c.id,
      amountCents: amounts[i],
    })),
    unallocatedCents: amountCents - target,
  };
}
