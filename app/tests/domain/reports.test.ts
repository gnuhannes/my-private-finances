import { describe, expect, it } from "vitest";
import { mapTopPayeesForChart, mapCategoryBreakdownForChart } from "../../src/domain/reports";

describe("mapTopPayeesForChart", () => {
  it("maps payee totals to positive chart values", () => {
    const out = mapTopPayeesForChart([{ payee: "REWE", total: "-12.34" }]);
    expect(out).toEqual([{ payee: "REWE", amount: 12.34 }]);
  });

  it("uses (unknown) for null payee", () => {
    const out = mapTopPayeesForChart([{ payee: null, total: "-1.00" }]);
    expect(out[0]?.payee).toBe("(unknown)");
  });

  it("filters invalid totals", () => {
    const out = mapTopPayeesForChart([
      { payee: "A", total: "abc" },
      { payee: "B", total: "-10.00" },
    ]);

    expect(out).toEqual([{ payee: "B", amount: 10 }]);
  });
});

describe("mapCategoryBreakdownForChart", () => {
  it("maps category totals to positive chart values", () => {
    const out = mapCategoryBreakdownForChart([{ category_name: "Groceries", total: "-50.00" }]);
    expect(out).toEqual([{ category: "Groceries", amount: 50 }]);
  });

  it("uses Uncategorized for null category_name", () => {
    const out = mapCategoryBreakdownForChart([{ category_name: null, total: "-10.00" }]);
    expect(out[0]?.category).toBe("Uncategorized");
  });

  it("filters invalid totals", () => {
    const out = mapCategoryBreakdownForChart([
      { category_name: "A", total: "abc" },
      { category_name: "B", total: "-20.00" },
    ]);
    expect(out).toEqual([{ category: "B", amount: 20 }]);
  });
});
