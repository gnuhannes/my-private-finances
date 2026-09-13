import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderApp } from "../render";
import { TransactionTable } from "../../src/components/TransactionTable";
import type { TransactionItem } from "../../src/lib/api";
import type { TransactionSplitRead } from "../../src/lib/api/transactionSplits";

// jsdom doesn't implement <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

let mockSplits: TransactionSplitRead[] = [];
vi.mock("../../src/lib/api/transactionSplits", () => ({
  getTransactionSplits: () => Promise.resolve(mockSplits),
  replaceTransactionSplits: vi.fn(),
  deleteTransactionSplits: vi.fn(),
}));

function tx(overrides: Partial<TransactionItem>): TransactionItem {
  return {
    id: 1,
    account_id: 1,
    booking_date: "2026-01-18",
    amount: "-12.34",
    currency: "EUR",
    payee: "Rewe",
    purpose: "Groceries",
    notes: null,
    category_id: null,
    external_id: null,
    import_source: null,
    import_hash: "abc123",
    is_transfer: false,
    split_count: 0,
    ...overrides,
  };
}

const sampleItems: TransactionItem[] = [
  tx({ id: 1, payee: "Rewe", purpose: "Groceries" }),
  tx({
    id: 2,
    booking_date: "2026-01-19",
    amount: "500.00",
    payee: "Employer",
    purpose: "Salary",
  }),
];

const noop = vi.fn();

describe("TransactionTable", () => {
  it("renders rows for each transaction", () => {
    renderApp(
      <TransactionTable
        items={sampleItems}
        currency="EUR"
        categories={[]}
        onCategoryChange={noop}
      />,
    );

    expect(screen.getByText("Rewe")).toBeInTheDocument();
    expect(screen.getByText("Employer")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("2026-01-18")).toBeInTheDocument();
    expect(screen.getByText("2026-01-19")).toBeInTheDocument();
  });

  it("shows empty message when no items", () => {
    renderApp(
      <TransactionTable items={[]} currency="EUR" categories={[]} onCategoryChange={noop} />,
    );
    expect(screen.getByText("No transactions found.")).toBeInTheDocument();
  });

  it("shows a Split chip instead of the category dropdown for split rows", () => {
    renderApp(
      <TransactionTable
        items={[tx({ split_count: 2 })]}
        currency="EUR"
        categories={[]}
        onCategoryChange={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Split (2)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Split" })).not.toBeInTheDocument();
  });

  it("shows a Split action button for non-transfer, unsplit rows", () => {
    renderApp(
      <TransactionTable
        items={[tx({ split_count: 0, is_transfer: false })]}
        currency="EUR"
        categories={[]}
        onCategoryChange={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "Split" })).toBeInTheDocument();
  });

  it("hides the Split action for transfer transactions", () => {
    renderApp(
      <TransactionTable
        items={[tx({ split_count: 0, is_transfer: true })]}
        currency="EUR"
        categories={[]}
        onCategoryChange={noop}
      />,
    );

    expect(screen.queryByRole("button", { name: "Split" })).not.toBeInTheDocument();
  });

  it("expands to preview split parts when the toggle is clicked", async () => {
    mockSplits = [
      { id: 1, category_id: 10, category_name: "Groceries", amount: "-8.00", note: null },
      { id: 2, category_id: 11, category_name: "Household", amount: "-4.34", note: null },
    ];

    renderApp(
      <TransactionTable
        items={[tx({ split_count: 2 })]}
        currency="EUR"
        categories={[]}
        onCategoryChange={noop}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle split preview" }));

    await waitFor(() => {
      expect(screen.getByText("Household")).toBeInTheDocument();
    });
  });

  it("opens the split dialog when the Split chip is clicked", () => {
    mockSplits = [];
    renderApp(
      <TransactionTable
        items={[tx({ split_count: 2 })]}
        currency="EUR"
        categories={[]}
        onCategoryChange={noop}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Split (2)" }));
    expect(screen.getByText("Split Transaction")).toBeInTheDocument();
  });
});
