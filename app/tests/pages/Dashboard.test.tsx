import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../../src/pages/Dashboard";

vi.mock("../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: [{ id: 1, name: "Main", currency: "EUR" }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../src/hooks/useMonthlyReport", () => ({
  useMonthlyReport: () => ({
    isLoading: false,
    isError: false,
    error: null,
    data: {
      account_id: 1,
      month: "2026-02",
      currency: "EUR",
      transactions_count: 12,
      income_total: "1000.00",
      expense_total: "-400.00",
      net_total: "600.00",
      top_payees: [{ payee: "REWE", total: "-120.00" }],
      category_breakdown: [{ category_name: "Groceries", total: "-120.00" }],
      top_spendings: [
        {
          booking_date: "2026-02-03",
          payee: "REWE",
          purpose: "Groceries",
          amount: "-120.00",
          category_name: "Groceries",
        },
      ],
    },
  }),
}));

describe("Dashboard", () => {
  it("renders KPI labels", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    expect(screen.getByText("Net")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
  });

  it("renders Top Payees section", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText("Top Payees")).toBeInTheDocument();
  });
});
