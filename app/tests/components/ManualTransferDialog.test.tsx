import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderApp } from "../render";
import { ManualTransferDialog } from "../../src/components/ManualTransferDialog";
import type { TransactionItem } from "../../src/lib/api/transactions";

// jsdom doesn't implement <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

vi.mock("../../src/lib/api/accounts", () => ({
  getAccounts: () =>
    Promise.resolve([
      { id: 1, name: "Checking", currency: "EUR", account_type: "bank" },
      { id: 2, name: "PayPal", currency: "EUR", account_type: "bank" },
      { id: 3, name: "Wallet", currency: "EUR", account_type: "cash" },
    ]),
}));

function tx(overrides: Partial<TransactionItem>): TransactionItem {
  return {
    id: 0,
    account_id: 1,
    booking_date: "2026-05-01",
    amount: "0",
    currency: "EUR",
    payee: null,
    purpose: null,
    notes: null,
    category_id: null,
    external_id: null,
    import_source: null,
    import_hash: "h",
    is_transfer: false,
    split_count: 0,
    ...overrides,
  };
}

const outgoing = tx({ id: 10, account_id: 1, amount: "-50.25", payee: "PayPal Top-up" });
const incoming = tx({
  id: 20,
  account_id: 2,
  amount: "50.00",
  payee: "Bank Deposit",
  booking_date: "2026-05-06",
});
const alreadyLinked = tx({
  id: 30,
  account_id: 2,
  amount: "12.00",
  payee: "Old transfer",
  is_transfer: true,
});

vi.mock("../../src/lib/api/transactions", () => ({
  getTransactions: (params: { accountId: number | "all" }) => {
    const items = [outgoing, incoming, alreadyLinked].filter(
      (t) => t.account_id === params.accountId,
    );
    return Promise.resolve({ items, total: items.length });
  },
  createTransaction: (params: unknown) => createTransaction(params),
}));

const createTransaction = vi.fn((params: { accountId: number; amount: string }) =>
  Promise.resolve(
    tx({
      id: 99,
      account_id: params.accountId,
      amount: params.amount,
      payee: "Cash Deposit",
    }),
  ),
);

const linkManualTransfer = vi.fn();
vi.mock("../../src/lib/api/transfers", () => ({
  linkManualTransfer: (params: unknown) => linkManualTransfer(params),
}));

/** Render the dialog and wait for the (async) account list to populate both pickers' selects. */
async function renderDialogReady() {
  renderApp(<ManualTransferDialog open onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getAllByRole("option", { name: "Checking" })).toHaveLength(2));
}

describe("ManualTransferDialog", () => {
  it("only lists a negative-amount, non-transfer result on the From side", async () => {
    await renderDialogReady();

    fireEvent.change(screen.getAllByLabelText(/account/i)[0], { target: { value: "1" } });

    await waitFor(() => expect(screen.getByText("PayPal Top-up")).toBeInTheDocument());
  });

  it("excludes already-linked transactions and only shows positive amounts on the To side", async () => {
    await renderDialogReady();

    fireEvent.change(screen.getAllByLabelText(/account/i)[1], { target: { value: "2" } });

    await waitFor(() => expect(screen.getByText("Bank Deposit")).toBeInTheDocument());
    expect(screen.queryByText("Old transfer")).not.toBeInTheDocument();
  });

  it("excludes the account chosen on the other side from each picker's account list", async () => {
    await renderDialogReady();

    const fromAccountSelect = screen.getAllByLabelText(/account/i)[0] as HTMLSelectElement;
    fireEvent.change(fromAccountSelect, { target: { value: "1" } });

    const toAccountSelect = screen.getAllByLabelText(/account/i)[1] as HTMLSelectElement;
    const toOptions = Array.from(toAccountSelect.options).map((o) => o.value);
    expect(toOptions).not.toContain("1");
    expect(toOptions).toContain("2");
  });

  it("disables submit until both legs are selected, then submits the pair", async () => {
    await renderDialogReady();

    expect(screen.getByRole("button", { name: /link as transfer/i })).toBeDisabled();

    fireEvent.change(screen.getAllByLabelText(/account/i)[0], { target: { value: "1" } });
    await waitFor(() => screen.getByText("PayPal Top-up"));
    fireEvent.click(screen.getByText("PayPal Top-up"));

    expect(screen.getByRole("button", { name: /link as transfer/i })).toBeDisabled();

    fireEvent.change(screen.getAllByLabelText(/account/i)[0], { target: { value: "2" } });
    await waitFor(() => screen.getByText("Bank Deposit"));
    fireEvent.click(screen.getByText("Bank Deposit"));

    const submitBtn = screen.getByRole("button", { name: /link as transfer/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() =>
      expect(linkManualTransfer).toHaveBeenCalledWith({
        fromTransactionId: 10,
        toTransactionId: 20,
      }),
    );
    await waitFor(() => expect(screen.getByText(/linked as a transfer/i)).toBeInTheDocument());
  });

  it("only offers to create a transaction inline for a cash account", async () => {
    await renderDialogReady();

    // Bank account (Checking): no "create new transaction" option.
    fireEvent.change(screen.getAllByLabelText(/account/i)[1], { target: { value: "1" } });
    await waitFor(() => expect(screen.getByText(/no matching transactions/i)).toBeInTheDocument());
    expect(screen.queryByText(/create a new transaction/i)).not.toBeInTheDocument();

    // Cash account (Wallet): option appears.
    fireEvent.change(screen.getAllByLabelText(/account/i)[1], { target: { value: "3" } });
    await waitFor(() => expect(screen.getByText(/create a new transaction/i)).toBeInTheDocument());
  });

  it("creates a transaction inline for a cash account and selects it", async () => {
    await renderDialogReady();

    fireEvent.change(screen.getAllByLabelText(/account/i)[1], { target: { value: "3" } });
    await waitFor(() => screen.getByText(/create a new transaction/i));
    fireEvent.click(screen.getByText(/create a new transaction/i));

    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: "2026-05-06" } });
    fireEvent.change(screen.getByLabelText(/^amount$/i), { target: { value: "50.00" } });
    fireEvent.change(screen.getByLabelText(/^payee$/i), { target: { value: "Cash top-up" } });

    fireEvent.click(screen.getByRole("button", { name: /add & select/i }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 3,
          bookingDate: "2026-05-06",
          amount: "50.00",
        }),
      ),
    );
    await waitFor(() => expect(screen.getByText("Cash Deposit")).toBeInTheDocument());
  });
});
