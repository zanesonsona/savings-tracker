import { describe, expect, it } from "vitest";
import { walletBalanceCents } from "./wallet";

const zero = { incomeCents: 0, expenseCents: 0, depositCents: 0, withdrawalCents: 0 };

describe("walletBalanceCents (D18/T28)", () => {
  it("an empty account is ₱0.00", () => {
    expect(walletBalanceCents(zero)).toBe(0);
  });

  it("T28 reconciliation: income 5000 − spent 200 − savings net 800 → 4000", () => {
    expect(
      walletBalanceCents({
        incomeCents: 500000,
        expenseCents: 20000,
        depositCents: 80000,
        withdrawalCents: 0,
      }),
    ).toBe(400000);
  });

  it("withdrawals return cash to the wallet", () => {
    // Deposited 800, withdrew 300 → net saved 500; wallet keeps the other 500.
    expect(
      walletBalanceCents({
        incomeCents: 100000,
        expenseCents: 0,
        depositCents: 80000,
        withdrawalCents: 30000,
      }),
    ).toBe(50000);
  });

  it("goes negative when spending/saving exceeds income", () => {
    expect(
      walletBalanceCents({
        incomeCents: 10000,
        expenseCents: 30000,
        depositCents: 0,
        withdrawalCents: 0,
      }),
    ).toBe(-20000);
  });

  it("is unaffected by savings entries moving between deposit and withdrawal", () => {
    const asDeposit = walletBalanceCents({ ...zero, incomeCents: 50000, depositCents: 10000 });
    const asWithdrawal = walletBalanceCents({ ...zero, incomeCents: 60000, withdrawalCents: 10000 });
    expect(asDeposit).toBe(40000);
    expect(asWithdrawal).toBe(70000);
  });
});
