import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Transactions from "../../src/pages/Transactions";

vi.mock("../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: [{ id: 1, name: "Main", currency: "EUR" }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../src/hooks/useCategories", () => ({
  useCategories: () => ({
    data: [{ id: 1, name: "Groceries", parent_id: null }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../src/hooks/useUpdateTransactionCategory", () => ({
  useUpdateTransactionCategory: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock("../../src/hooks/useTransactions", () => ({
  useTransactions: () => ({
    isLoading: false,
    isError: false,
    error: null,
    data: {
      items: [
        {
          id: 10,
          account_id: 1,
          booking_date: "2026-01-18",
          amount: "-12.34",
          currency: "EUR",
          payee: "Rewe",
          purpose: "Groceries",
          category_id: null,
          external_id: null,
          import_source: null,
          import_hash: "abc",
        },
      ],
      total: 1,
    },
  }),
}));

describe("Transactions", () => {
  it("renders page title", () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>,
    );

    expect(screen.getByText("Transactions")).toBeInTheDocument();
  });

  it("renders account selector", () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>,
    );

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("#1 — Main (EUR)")).toBeInTheDocument();
  });

  it("renders date filter inputs", () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>,
    );

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
  });

  it("renders transaction rows", () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>,
    );

    expect(screen.getByText("Rewe")).toBeInTheDocument();
    expect(screen.getAllByText("Groceries").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2026-01-18")).toBeInTheDocument();
  });
});
