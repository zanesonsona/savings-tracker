import { describe, expect, it } from "vitest";
import { parseCategoryIdsParam } from "./validation";

describe("parseCategoryIdsParam (T29)", () => {
  it("absent or empty parameter → null (all categories)", () => {
    expect(parseCategoryIdsParam(null)).toBeNull();
    expect(parseCategoryIdsParam("")).toBeNull();
    expect(parseCategoryIdsParam("   ")).toBeNull();
  });

  it("parses a comma-separated id list (spaces tolerated)", () => {
    expect(parseCategoryIdsParam("1,2,3")).toEqual([1, 2, 3]);
    expect(parseCategoryIdsParam(" 4 , 5 ")).toEqual([4, 5]);
  });

  it("de-duplicates repeated ids, keeping first-seen order", () => {
    expect(parseCategoryIdsParam("5,2,5,2,1")).toEqual([5, 2, 1]);
  });

  it("malformed entries → 'invalid'", () => {
    for (const raw of ["abc", "1,,2", "1,2,", ",1", "1.5", "-1", "0", "1e3", "١", "1;2"]) {
      expect(parseCategoryIdsParam(raw)).toBe("invalid");
    }
  });

  it("unsafe integers → 'invalid'", () => {
    expect(parseCategoryIdsParam("99999999999999999999")).toBe("invalid");
  });
});
