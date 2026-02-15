import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionTable } from "../../src/components/TransactionTable";
import type { TransactionItem } from "../../src/lib/api";

const sampleItems: TransactionItem[] = [
  {
    id: 1,
    account_id: 1,
    booking_date: "2026-01-18",
    amount: "-12.34",
    currency: "EUR",
    payee: "Rewe",
    purpose: "Groceries",
    category_id: null,
    external_id: null,
    import_source: null,
    import_hash: "abc123",
  },
  {
    id: 2,
    account_id: 1,
    booking_date: "2026-01-19",
    amount: "500.00",
    currency: "EUR",
    payee: "Employer",
    purpose: "Salary",
    category_id: null,
    external_id: null,
    import_source: null,
    import_hash: "def456",
  },
];

describe("TransactionTable", () => {
  it("renders rows for each transaction", () => {
    render(<TransactionTable items={sampleItems} currency="EUR" />);

    expect(screen.getByText("Rewe")).toBeInTheDocument();
    expect(screen.getByText("Employer")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("2026-01-18")).toBeInTheDocument();
    expect(screen.getByText("2026-01-19")).toBeInTheDocument();
  });

  it("shows empty message when no items", () => {
    render(<TransactionTable items={[]} currency="EUR" />);
    expect(screen.getByText("No transactions found.")).toBeInTheDocument();
  });
});
