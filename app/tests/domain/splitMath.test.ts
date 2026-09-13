import { describe, expect, it } from "vitest";
import {
  amountCentsToPercent,
  centsToMoneyString,
  parseMoneyToCents,
  percentsToAmountCents,
  splitEvenlyCents,
  sumCents,
} from "../../src/domain/splitMath";

describe("parseMoneyToCents / centsToMoneyString", () => {
  it("round-trips a positive amount", () => {
    expect(parseMoneyToCents("12.34")).toBe(1234);
    expect(centsToMoneyString(1234)).toBe("12.34");
  });

  it("round-trips a negative amount", () => {
    expect(parseMoneyToCents("-12.34")).toBe(-1234);
    expect(centsToMoneyString(-1234)).toBe("-12.34");
  });

  it("handles zero", () => {
    expect(parseMoneyToCents("0")).toBe(0);
    expect(centsToMoneyString(0)).toBe("0.00");
  });

  it("pads single-digit cents", () => {
    expect(centsToMoneyString(500)).toBe("5.00");
    expect(centsToMoneyString(-5)).toBe("-0.05");
  });

  it("returns 0 for unparsable input", () => {
    expect(parseMoneyToCents("abc")).toBe(0);
  });
});

describe("splitEvenlyCents", () => {
  it("splits evenly when it divides exactly", () => {
    expect(splitEvenlyCents(1000, 2)).toEqual([500, 500]);
  });

  it("puts the remainder on the last row", () => {
    const amounts = splitEvenlyCents(1000, 3);
    expect(sumCents(amounts)).toBe(1000);
    expect(amounts[0]).toBe(333);
    expect(amounts[1]).toBe(333);
    expect(amounts[2]).toBe(334);
  });

  it("handles negative totals (expenses)", () => {
    const amounts = splitEvenlyCents(-1234, 3);
    expect(sumCents(amounts)).toBe(-1234);
  });

  it("returns an empty array for zero rows", () => {
    expect(splitEvenlyCents(1000, 0)).toEqual([]);
  });
});

describe("percentsToAmountCents", () => {
  it("converts exact percentages with no rounding needed", () => {
    expect(percentsToAmountCents(10000, [70, 30])).toEqual([7000, 3000]);
  });

  it("absorbs rounding leftover into the last row so the sum is exact", () => {
    // 33.33% of 1000 rounds to 333, three of those would sum to 999 — the
    // last row must pick up the missing cent.
    const amounts = percentsToAmountCents(1000, [33.33, 33.33, 33.33]);
    expect(sumCents(amounts)).toBe(1000);
    expect(amounts[0]).toBe(333);
    expect(amounts[1]).toBe(333);
    expect(amounts[2]).toBe(334);
  });

  it("ignores the last percentage value and uses it purely as a remainder slot", () => {
    // Whatever is passed for the last row's percent, the amount is always
    // total - sum(others).
    const a = percentsToAmountCents(10000, [70, 999]);
    const b = percentsToAmountCents(10000, [70, -50]);
    expect(a).toEqual([7000, 3000]);
    expect(b).toEqual([7000, 3000]);
  });

  it("works with a negative total", () => {
    const amounts = percentsToAmountCents(-10000, [70, 30]);
    expect(amounts).toEqual([-7000, -3000]);
  });

  it("returns an empty array for no rows", () => {
    expect(percentsToAmountCents(1000, [])).toEqual([]);
  });
});

describe("amountCentsToPercent", () => {
  it("computes the percentage an amount represents of the total", () => {
    expect(amountCentsToPercent(3000, 10000)).toBeCloseTo(30, 5);
  });

  it("returns 0 when the total is 0", () => {
    expect(amountCentsToPercent(100, 0)).toBe(0);
  });
});
