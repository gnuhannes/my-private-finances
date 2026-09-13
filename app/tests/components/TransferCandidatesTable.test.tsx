import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransferCandidatesTable } from "../../src/components/TransferCandidatesTable";
import type { TransferCandidate } from "../../src/lib/api/transfers";

function candidate(overrides: Partial<TransferCandidate>): TransferCandidate {
  return {
    id: 1,
    from_leg: {
      transaction_id: 10,
      account_id: 1,
      account_name: "Checking",
      booking_date: "2026-05-01",
      amount: "-50.25",
      payee: "PayPal",
    },
    to_leg: {
      transaction_id: 20,
      account_id: 2,
      account_name: "PayPal",
      booking_date: "2026-05-06",
      amount: "50.00",
      payee: "Bank Deposit",
    },
    confidence: "1.00",
    status: "confirmed",
    source: "auto",
    ...overrides,
  };
}

function renderTable(props: Partial<Parameters<typeof TransferCandidatesTable>[0]>) {
  return render(<TransferCandidatesTable items={props.items ?? []} {...props} />);
}

describe("TransferCandidatesTable", () => {
  it("shows an Auto badge for auto-detected candidates", () => {
    renderTable({ items: [candidate({ source: "auto" })] });
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("shows a Manual badge for manually-linked candidates", () => {
    renderTable({ items: [candidate({ source: "manual" })] });
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("does not show an Unlink action without onUnlink", () => {
    renderTable({ items: [candidate({ status: "confirmed" })] });
    expect(screen.queryByRole("button", { name: /unlink/i })).not.toBeInTheDocument();
  });

  it("shows Unlink only for confirmed rows when onUnlink is provided", () => {
    renderTable({
      items: [candidate({ id: 1, status: "confirmed" }), candidate({ id: 2, status: "pending" })],
      onUnlink: vi.fn(),
    });
    expect(screen.getAllByRole("button", { name: /unlink/i })).toHaveLength(1);
  });

  it("confirms before unlinking and calls onUnlink", () => {
    const onUnlink = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTable({ items: [candidate({ id: 5, status: "confirmed" })], onUnlink });

    screen.getByRole("button", { name: /unlink/i }).click();

    expect(window.confirm).toHaveBeenCalled();
    expect(onUnlink).toHaveBeenCalledWith(5);
  });

  it("does not unlink when the confirmation is declined", () => {
    const onUnlink = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTable({ items: [candidate({ id: 5, status: "confirmed" })], onUnlink });

    screen.getByRole("button", { name: /unlink/i }).click();

    expect(onUnlink).not.toHaveBeenCalled();
  });
});
