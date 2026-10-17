// All-time "wallet" formula (D18 / T28): cash on hand.
//
//   walletBalanceCents = Σ all-time income − Σ all-time expenses − savings net
//   (savings net = Σ deposits − Σ withdrawals)
//
// Money that came in but was neither spent nor (net) put aside. Withdrawals
// return cash to the wallet; negative values are allowed (spent/saved more
// than earned). Computed live from the row sets — never stored (D6-style).

export interface WalletParts {
  incomeCents: number;
  expenseCents: number;
  depositCents: number;
  withdrawalCents: number;
}

export function walletBalanceCents(parts: WalletParts): number {
  return parts.incomeCents - parts.expenseCents - (parts.depositCents - parts.withdrawalCents);
}
