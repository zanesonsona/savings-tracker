import { describe, expect, it } from "vitest";
import { splitIncome } from "./allocation";

const cats = (...percentages: number[]) =>
  percentages.map((percentage, i) => ({ id: i + 1, percentage }));

describe("splitIncome (largest remainder, §7)", () => {
  it("100 cents @ 33.33/33.33/33.34 → [33, 33, 34]", () => {
    const result = splitIncome(100, cats(33.33, 33.33, 33.34));
    expect(result.allocations.map((a) => a.amountCents)).toEqual([33, 33, 34]);
    expect(result.unallocatedCents).toBe(0);
  });

  it("1 cent @ 50/30/20 → [1, 0, 0]", () => {
    const result = splitIncome(1, cats(50, 30, 20));
    expect(result.allocations.map((a) => a.amountCents)).toEqual([1, 0, 0]);
    expect(result.unallocatedCents).toBe(0);
  });

  it("Σ=80% leaves exactly 20% unallocated", () => {
    const result = splitIncome(10000, cats(50, 30));
    expect(result.allocations.map((a) => a.amountCents)).toEqual([5000, 3000]);
    expect(result.unallocatedCents).toBe(2000);
  });

  it("acceptance: 500000¢ (₱5000.00) @ 35/25/20/20 → 175000/125000/100000/100000", () => {
    const result = splitIncome(500000, cats(35, 25, 20, 20));
    expect(result.allocations.map((a) => a.amountCents)).toEqual([175000, 125000, 100000, 100000]);
    expect(result.unallocatedCents).toBe(0);
  });

  it("breaks remainder ties by lower category id", () => {
    const result = splitIncome(1, [
      { id: 5, percentage: 50 },
      { id: 2, percentage: 50 },
    ]);
    expect(result.allocations).toEqual([
      { categoryId: 5, amountCents: 0 },
      { categoryId: 2, amountCents: 1 },
    ]);
  });

  it("empty category list → everything unallocated", () => {
    const result = splitIncome(12345, []);
    expect(result.allocations).toEqual([]);
    expect(result.unallocatedCents).toBe(12345);
  });

  it("invariant Σ allocations + unallocated == amountCents (randomized) ", () => {
    // Deterministic pseudo-random generator so failures are reproducible.
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    for (let i = 0; i < 500; i++) {
      const count = 1 + Math.floor(rand() * 6);
      const amountCents = Math.floor(rand() * 1_000_000);
      const budgetBp = Math.max(1, Math.floor(rand() * 10000)); // Σ% can be < 100

      const bps: number[] = [];
      let left = budgetBp;
      for (let j = 0; j < count; j++) {
        const take = j === count - 1 ? left : Math.floor(rand() * left);
        bps.push(take);
        left -= take;
      }

      const categories = bps.map((bp, idx) => ({ id: idx + 1, percentage: bp / 100 }));
      const result = splitIncome(amountCents, categories);

      const allocated = result.allocations.reduce((sum, a) => sum + a.amountCents, 0);
      expect(allocated + result.unallocatedCents).toBe(amountCents);
      expect(result.unallocatedCents).toBeGreaterThanOrEqual(0);
      for (const a of result.allocations) expect(a.amountCents).toBeGreaterThanOrEqual(0);
    }
  });
});
