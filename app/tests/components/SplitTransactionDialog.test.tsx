import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderApp } from "../render";
import { SplitTransactionDialog } from "../../src/components/SplitTransactionDialog";
import type { TransactionItem } from "../../src/lib/api/transactions";
import type { TransactionSplitRead } from "../../src/lib/api/transactionSplits";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

const getTransactionSplits = vi.fn<() => Promise<TransactionSplitRead[]>>();
const replaceTransactionSplits = vi.fn();
const deleteTransactionSplits = vi.fn();

vi.mock("../../src/lib/api/transactionSplits", () => ({
  getTransactionSplits: (...args: unknown[]) =>
    (getTransactionSplits as (...a: unknown[]) => unknown)(...args),
  replaceTransactionSplits: (...args: unknown[]) =>
    (replaceTransactionSplits as (...a: unknown[]) => unknown)(...args),
  deleteTransactionSplits: (...args: unknown[]) =>
    (deleteTransactionSplits as (...a: unknown[]) => unknown)(...args),
}));

const transaction: TransactionItem = {
  id: 42,
  account_id: 1,
  booking_date: "2026-02-01",
  amount: "-100.00",
  currency: "EUR",
  payee: "Supermarket",
  purpose: null,
  notes: null,
  category_id: null,
  external_id: null,
  import_source: null,
  import_hash: "h1",
  is_transfer: false,
  split_count: 0,
};

const onClose = vi.fn();

beforeEach(() => {
  onClose.mockReset();
  getTransactionSplits.mockReset().mockResolvedValue([]);
  replaceTransactionSplits.mockReset().mockResolvedValue([]);
  deleteTransactionSplits.mockReset().mockResolvedValue(undefined);
});

describe("SplitTransactionDialog", () => {
  it("disables Save until the sum matches the total exactly", async () => {
    renderApp(
      <SplitTransactionDialog open onClose={onClose} transaction={transaction} categories={[]} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("Amount")).toHaveLength(2));
    const saveBtn = screen.getByRole("button", { name: "Save" });
    expect(saveBtn).toBeDisabled();

    const [amount1, amount2] = screen.getAllByLabelText("Amount");
    fireEvent.change(amount1, { target: { value: "-60.00" } });
    expect(saveBtn).toBeDisabled();

    fireEvent.change(amount2, { target: { value: "-40.00" } });
    expect(saveBtn).not.toBeDisabled();
  });

  it("requires at least 2 rows even if the sum matches", async () => {
    renderApp(
      <SplitTransactionDialog open onClose={onClose} transaction={transaction} categories={[]} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("Amount")).toHaveLength(2));
    const [amount1, amount2] = screen.getAllByLabelText("Amount");
    fireEvent.change(amount1, { target: { value: "-60.00" } });
    fireEvent.change(amount2, { target: { value: "-40.00" } });
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();

    fireEvent.click(screen.getAllByLabelText("Remove row")[1]);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("split evenly fills both rows so the sum is exact", async () => {
    renderApp(
      <SplitTransactionDialog open onClose={onClose} transaction={transaction} categories={[]} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("Amount")).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Split evenly" }));

    const [amount1, amount2] = screen.getAllByLabelText("Amount");
    expect(amount1).toHaveValue("-50.00");
    expect(amount2).toHaveValue("-50.00");
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("percentage mode computes amounts live and always sums exactly", async () => {
    renderApp(
      <SplitTransactionDialog open onClose={onClose} transaction={transaction} categories={[]} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("Amount")).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Percentages" }));

    const percentInputs = screen.getAllByLabelText("Percent");
    fireEvent.change(percentInputs[0], { target: { value: "70" } });

    await waitFor(() => {
      expect(screen.getByText((c) => c.includes("70.00"))).toBeInTheDocument();
      expect(screen.getByText((c) => c.includes("30.00"))).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("saves via PUT with the row payload and closes on success", async () => {
    renderApp(
      <SplitTransactionDialog open onClose={onClose} transaction={transaction} categories={[]} />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("Amount")).toHaveLength(2));
    const [amount1, amount2] = screen.getAllByLabelText("Amount");
    fireEvent.change(amount1, { target: { value: "-60.00" } });
    fireEvent.change(amount2, { target: { value: "-40.00" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(replaceTransactionSplits).toHaveBeenCalledWith(42, [
      { category_id: null, amount: "-60.00", note: null },
      { category_id: null, amount: "-40.00", note: null },
    ]);
  });

  it("loads existing splits for editing and offers Remove split", async () => {
    getTransactionSplits.mockResolvedValue([
      { id: 1, category_id: 5, category_name: "Groceries", amount: "-60.00", note: null },
      { id: 2, category_id: 6, category_name: "Household", amount: "-40.00", note: "cleaning" },
    ]);

    renderApp(
      <SplitTransactionDialog
        open
        onClose={onClose}
        transaction={{ ...transaction, split_count: 2 }}
        categories={[]}
      />,
    );

    await waitFor(() => expect(screen.getAllByLabelText("Amount")).toHaveLength(2));
    const [amount1, amount2] = screen.getAllByLabelText("Amount");
    expect(amount1).toHaveValue("-60.00");
    expect(amount2).toHaveValue("-40.00");
    expect(screen.getByRole("button", { name: "Remove split" })).toBeInTheDocument();
  });

  it("reverts to a simple transaction via DELETE", async () => {
    getTransactionSplits.mockResolvedValue([
      { id: 1, category_id: 5, category_name: "Groceries", amount: "-60.00", note: null },
      { id: 2, category_id: 6, category_name: "Household", amount: "-40.00", note: null },
    ]);

    renderApp(
      <SplitTransactionDialog
        open
        onClose={onClose}
        transaction={{ ...transaction, split_count: 2 }}
        categories={[]}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove split" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove split" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(deleteTransactionSplits).toHaveBeenCalledWith(42);
  });
});
