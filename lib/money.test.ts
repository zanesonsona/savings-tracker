import { describe, expect, it } from "vitest";
import { currencySymbol, formatCents, toCents } from "./money";

describe("toCents", () => {
  it("converts decimal strings to integer cents", () => {
    expect(toCents("1234.56")).toBe(123456);
    expect(toCents("0.01")).toBe(1);
    expect(toCents("5000")).toBe(500000);
    expect(toCents("1,234.56")).toBe(123456);
    expect(toCents("0")).toBe(0);
  });

  it("rounds to the nearest cent (half up)", () => {
    expect(toCents("1.005")).toBe(101);
    expect(toCents("1.004")).toBe(100);
    expect(toCents("0.999")).toBe(100);
  });

  it("accepts numbers (incl. float noise)", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("rejects negatives, NaN/Infinity and malformed strings", () => {
    expect(() => toCents(-5)).toThrow();
    expect(() => toCents(-0.01)).toThrow();
    expect(() => toCents(NaN)).toThrow();
    expect(() => toCents(Infinity)).toThrow();
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("")).toThrow();
    expect(() => toCents("1.2.3")).toThrow();
    expect(() => toCents("-3")).toThrow();
  });
});

describe("formatCents", () => {
  it("formats PHP amounts", () => {
    expect(formatCents(123456)).toBe("₱1,234.56");
    expect(formatCents(1)).toBe("₱0.01");
    expect(formatCents(0)).toBe("₱0.00");
    expect(formatCents(100000000)).toBe("₱1,000,000.00");
  });

  it("formats negative amounts", () => {
    expect(formatCents(-800)).toBe("-₱8.00");
  });

  it("exposes the currency symbol for compact form prefixes", () => {
    expect(currencySymbol()).toBe("₱");
  });
});
