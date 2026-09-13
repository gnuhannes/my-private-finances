import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import WelcomeWizard from "../../../src/pages/Welcome/WelcomeWizard";

interface AccountCreatePayload {
  name: string;
  currency: string;
  account_type: string;
  opening_balance?: string;
  opening_balance_date?: string;
}

const updateSettingsMutate = vi.fn();
const createAccountMutate = vi.fn(
  (_payload: AccountCreatePayload, opts?: { onSuccess?: () => void }) => {
    opts?.onSuccess?.();
  },
);

let accountsData: Array<{ id: number; name: string; currency: string }> = [];

vi.mock("../../../src/hooks/useAppSettings", () => ({
  useAppSettings: () => ({
    data: { onboarding_completed_at: null, onboarding_skipped: false, default_currency: "EUR" },
    isLoading: false,
  }),
  useUpdateAppSettings: () => ({ mutate: updateSettingsMutate, isPending: false }),
}));

vi.mock("../../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: accountsData, isLoading: false, error: null }),
}));

vi.mock("../../../src/hooks/useNetWorth", () => ({
  useCreateAccount: () => ({ mutate: createAccountMutate, isPending: false }),
}));

function renderWizard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WelcomeWizard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WelcomeWizard", () => {
  beforeEach(() => {
    accountsData = [];
    updateSettingsMutate.mockClear();
    createAccountMutate.mockClear();
  });

  it("shows step 1 of 5 on the intro step", () => {
    renderWizard();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByText("Welcome to My Private Finances")).toBeInTheDocument();
  });

  it("advances to the account step on Next", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByText("Add your first account")).toBeInTheDocument();
  });

  it("disables Next on the account step until an account exists", () => {
    accountsData = [];
    renderWizard();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("enables Next on the account step once an account exists", () => {
    accountsData = [{ id: 1, name: "Main", currency: "EUR" }];
    renderWizard();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("Back returns to the intro step", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("skip stamps completion and skipped flag", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Skip setup"));
    expect(updateSettingsMutate).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_skipped: true }),
      expect.anything(),
    );
    const [payload] = updateSettingsMutate.mock.calls[0];
    expect(payload.onboarding_completed_at).toBeTypeOf("string");
  });

  it("submits the account form with the starting balance and as-of date", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Next"));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Checking" } });
    fireEvent.change(screen.getByLabelText("Starting balance"), { target: { value: "1000" } });
    fireEvent.click(screen.getByText("Add account"));

    expect(createAccountMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Checking",
        opening_balance: "1000",
        account_type: "bank",
      }),
      expect.anything(),
    );
    const [payload] = createAccountMutate.mock.calls[0];
    expect(payload.opening_balance_date).toBeTypeOf("string");
  });
});
