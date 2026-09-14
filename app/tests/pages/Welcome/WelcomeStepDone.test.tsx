import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { WelcomeStepDone } from "../../../src/pages/Welcome/WelcomeStepDone";

const updateSettingsMutate = vi.fn();

vi.mock("../../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: [{ id: 1, name: "Checking", currency: "EUR", opening_balance: "1000.00" }],
  }),
}));

vi.mock("../../../src/hooks/useCategories", () => ({
  useCategories: () => ({ data: [{ id: 1 }, { id: 2 }] }),
}));

vi.mock("../../../src/hooks/useTransactions", () => ({
  useTransactions: () => ({ data: { items: [], total: 42 } }),
}));

vi.mock("../../../src/hooks/useAppSettings", () => ({
  useUpdateAppSettings: () => ({ mutate: updateSettingsMutate }),
}));

function renderStep() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WelcomeStepDone defaultCurrency="EUR" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WelcomeStepDone", () => {
  it("shows a summary line with account, balance, category, and transaction counts", () => {
    renderStep();
    const summary = screen.getByText((content) => content.includes("42 transactions"));
    expect(summary.textContent).toContain("1 account(s)");
    expect(summary.textContent).toContain("2 categories");
    expect(summary.textContent).toContain("42 transactions");
    expect(summary.textContent).toMatch(/1,?000|1\.000/); // locale-dependent grouping
  });

  it("stamps onboarding completion when a link is clicked", () => {
    renderStep();
    fireEvent.click(screen.getByText("Go to Dashboard"));
    expect(updateSettingsMutate).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_completed_at: expect.any(String) }),
    );
  });
});
