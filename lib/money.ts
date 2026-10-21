import { APP_CURRENCY, APP_LOCALE } from "./constants";

/**
 * Convert a user-entered amount (e.g. "1234.56") to integer cents.
 * - Rounds to the nearest cent (half up).
 * - Rejects NaN, Infinity, negatives and malformed strings.
 * - Accepts thousands separators ("1,234.56").
 */
export function toCents(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Amount must be a finite number");
    if (input < 0) throw new Error("Amount cannot be negative");
    // toFixed(20) expands scientific notation (e.g. 1e-7) into a plain decimal string.
    return centsFromDecimalString(input.toFixed(20));
  }
  return centsFromDecimalString(input.trim());
}

function centsFromDecimalString(value: string): number {
  const normalized = value.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid amount (e.g. 1234.56)");
  }
  const [whole, frac = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(frac.slice(0, 2).padEnd(2, "0"));
  // 3rd+ decimal digits: round half up.
  return frac.slice(2, 3) >= "5" ? cents + 1 : cents;
}

/** Format integer cents as a currency string using APP_CURRENCY (never do float math on money). */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) throw new Error("formatCents expects a finite number of cents");
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
  }).format(cents / 100);
}

/** The configured currency's symbol (e.g. "₱"), for compact form prefixes. */
export function currencySymbol(): string {
  return (
    new Intl.NumberFormat(APP_LOCALE, {
      style: "currency",
      currency: APP_CURRENCY,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? APP_CURRENCY
  );
}

/** Format basis points as a trimmed percentage string, e.g. 10550 → "105.5". */
export function formatPercentBp(bp: number): string {
  return Number((bp / 100).toFixed(2)).toString();
}
