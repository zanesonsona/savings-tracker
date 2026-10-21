import { describe, expect, it } from "vitest";
import {
  currentMonth,
  formatDate,
  monthLabel,
  parseDate,
  parseMonth,
  shiftMonth,
  shortMonthLabel,
} from "./dates";

describe("parseMonth", () => {
  it("returns the UTC [start, end) range", () => {
    const { start, end } = parseMonth("2026-10");
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("crosses the year boundary", () => {
    const { start, end } = parseMonth("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("rejects malformed months", () => {
    for (const bad of ["2026-13", "2026-00", "2026-1", "26-01", "2026/10", ""]) {
      expect(() => parseMonth(bad)).toThrow();
    }
  });
});

describe("parseDate", () => {
  it("parses to UTC midnight", () => {
    expect(parseDate("2026-10-17").toISOString()).toBe("2026-10-17T00:00:00.000Z");
  });

  it("rejects malformed or overflowing dates", () => {
    expect(() => parseDate("2026-02-30")).toThrow();
    expect(() => parseDate("2026-00-10")).toThrow();
    expect(() => parseDate("2026-10-32")).toThrow();
    expect(() => parseDate("junk")).toThrow();
  });
});

describe("formatDate", () => {
  it("uses UTC parts (never shifts by timezone)", () => {
    expect(formatDate(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01-01");
    expect(formatDate(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12-31");
  });
});

describe("monthLabel", () => {
  it("produces a human label", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
  });
});

describe("shortMonthLabel", () => {
  it("produces a compact chart label with the two-digit year", () => {
    expect(shortMonthLabel("2026-10")).toBe("Oct ’26");
    expect(shortMonthLabel("2027-01")).toBe("Jan ’27");
  });
});

describe("shiftMonth", () => {
  it("shifts across boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-06", 6)).toBe("2026-12");
    expect(shiftMonth("2026-06", -6)).toBe("2025-12");
  });
});

describe("currentMonth", () => {
  it("formats from UTC parts", () => {
    expect(currentMonth(new Date("2026-10-17T23:59:59Z"))).toBe("2026-10");
    expect(currentMonth(new Date("2026-11-01T00:00:01Z"))).toBe("2026-11");
  });
});
