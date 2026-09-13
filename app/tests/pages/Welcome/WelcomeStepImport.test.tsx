import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { WelcomeStepImport } from "../../../src/pages/Welcome/WelcomeStepImport";

const importMutate = vi.fn();
let importState: {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: { created: number };
  error?: unknown;
} = { isPending: false, isSuccess: false, isError: false };

vi.mock("../../../src/hooks/useImportCsv", () => ({
  useImportCsv: () => ({ mutate: importMutate, ...importState }),
}));

vi.mock("../../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [{ id: 1, name: "Checking", currency: "EUR" }] }),
}));

vi.mock("../../../src/hooks/useCsvProfiles", () => ({
  useCsvProfiles: () => ({ profiles: { data: [] } }),
}));

const applyRules = vi.fn(() => Promise.resolve({ categorized: 3 }));
vi.mock("../../../src/lib/api/categorization-rules", () => ({
  applyRules: () => applyRules(),
}));

function renderStep(onSkip = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WelcomeStepImport onSkip={onSkip} />
    </QueryClientProvider>,
  );
}

describe("WelcomeStepImport", () => {
  beforeEach(() => {
    importMutate.mockClear();
    applyRules.mockClear();
    importState = { isPending: false, isSuccess: false, isError: false };
  });

  it("calls onSkip when 'I'll do this later' is clicked", () => {
    const onSkip = vi.fn();
    renderStep(onSkip);
    fireEvent.click(screen.getByText("I'll do this later"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("applies categorization rules and shows the import + auto-categorize counts on success", async () => {
    importState = { isPending: false, isSuccess: true, isError: false, data: { created: 12 } };
    renderStep();

    await waitFor(() => expect(applyRules).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText("12 imported, 3 auto-categorized.")).toBeInTheDocument();
    });
  });
});
