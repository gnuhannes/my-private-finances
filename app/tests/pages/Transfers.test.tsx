import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Transfers from "../../src/pages/Transfers";

const detect = { mutate: vi.fn(), isPending: false, isSuccess: false, data: [] };
const unlink = { mutate: vi.fn() };
const link = {
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  reset: vi.fn(),
};

const confirmedCandidate = {
  id: 2,
  from_leg: {
    transaction_id: 20,
    account_id: 1,
    account_name: "Checking",
    booking_date: "2026-01-05",
    amount: "-50.25",
    payee: "PayPal",
  },
  to_leg: {
    transaction_id: 21,
    account_id: 3,
    account_name: "PayPal",
    booking_date: "2026-01-08",
    amount: "50.00",
    payee: "Bank Deposit",
  },
  confidence: "1.00",
  status: "confirmed",
  source: "manual",
};

vi.mock("../../src/hooks/useTransferCandidates", () => ({
  useTransferCandidates: (status: string) => ({
    data:
      status === "pending"
        ? [
            {
              id: 1,
              from_leg: {
                transaction_id: 10,
                account_id: 1,
                account_name: "Checking",
                booking_date: "2026-01-01",
                amount: "-100.00",
                payee: "Savings",
              },
              to_leg: {
                transaction_id: 11,
                account_id: 2,
                account_name: "Savings",
                booking_date: "2026-01-01",
                amount: "100.00",
                payee: "Checking",
              },
              confidence: "0.9",
              status: "pending",
              source: "auto",
            },
          ]
        : status === "confirmed"
          ? [confirmedCandidate]
          : [],
    isLoading: false,
    isError: false,
  }),
  useDetectTransfers: () => detect,
  useConfirmTransfer: () => ({ mutate: vi.fn() }),
  useDismissTransfer: () => ({ mutate: vi.fn() }),
  useUnlinkTransfer: () => unlink,
  useLinkManualTransfer: () => link,
}));

vi.mock("../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [] }),
}));

vi.mock("../../src/hooks/useTransactions", () => ({
  useTransactions: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateTransaction: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}));

describe("Transfers page", () => {
  it("renders the pending candidate and count badge", () => {
    render(
      <MemoryRouter>
        <Transfers />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Inter-Account Transfers" })).toBeInTheDocument();
    // Both the pending (1) and confirmed (1) sections show a "1" count badge.
    expect(screen.getAllByText("1")).toHaveLength(2);
  });

  it("triggers detection on button click", () => {
    const { getByRole } = render(
      <MemoryRouter>
        <Transfers />
      </MemoryRouter>,
    );
    getByRole("button", { name: /detect/i }).click();
    expect(detect.mutate).toHaveBeenCalled();
  });

  it("renders the manual-link button and a source badge on confirmed transfers", () => {
    render(
      <MemoryRouter>
        <Transfers />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /link transactions manually/i })).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("unlinks a confirmed transfer after confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MemoryRouter>
        <Transfers />
      </MemoryRouter>,
    );
    screen.getByRole("button", { name: /unlink/i }).click();
    expect(unlink.mutate).toHaveBeenCalledWith(confirmedCandidate.id);
  });
});
