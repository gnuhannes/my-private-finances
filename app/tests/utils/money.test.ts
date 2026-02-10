import { describe, expect, it } from "vitest";
import { formatMoneyString } from "../../src/utils/money";

describe("formatMoneyString", () => {
  it("returns a formatted currency string for valid numbers", () => {
    const out = formatMoneyString("1000.00", "EUR");

    expect(out).toContain("€");
  });

  it("falls back for invalid numeric input", () => {
    const out = formatMoneyString("abc", "EUR");
    expect(out).toBe("abc EUR");
  });
});
