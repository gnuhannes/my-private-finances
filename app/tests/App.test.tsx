import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

const appSettingsState: {
  data: { onboarding_completed_at: string | null; default_currency: string } | undefined;
  isLoading: boolean;
} = {
  data: undefined,
  isLoading: true,
};

vi.mock("../src/hooks/useAppSettings", () => ({
  useAppSettings: () => appSettingsState,
  useUpdateAppSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../src/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [], isLoading: false, error: null }),
}));

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App onboarding guard", () => {
  beforeEach(() => {
    appSettingsState.data = undefined;
    appSettingsState.isLoading = true;
  });

  it("shows a splash while settings are loading", () => {
    appSettingsState.isLoading = true;
    renderAt("/");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("redirects to /welcome when onboarding has not been completed", () => {
    appSettingsState.isLoading = false;
    appSettingsState.data = { onboarding_completed_at: null, default_currency: "EUR" };
    renderAt("/transactions");
    expect(screen.getByText("Welcome to My Private Finances")).toBeInTheDocument();
  });

  it("renders the wizard on /welcome?rerun=1 even when onboarding is already complete", () => {
    appSettingsState.isLoading = false;
    appSettingsState.data = {
      onboarding_completed_at: "2026-01-01T00:00:00Z",
      default_currency: "EUR",
    };
    renderAt("/welcome?rerun=1");
    expect(screen.getByText("Welcome to My Private Finances")).toBeInTheDocument();
  });

  it("redirects away from /welcome when onboarding is already complete and rerun is not set", () => {
    appSettingsState.isLoading = false;
    appSettingsState.data = {
      onboarding_completed_at: "2026-01-01T00:00:00Z",
      default_currency: "EUR",
    };
    renderAt("/welcome");
    expect(screen.queryByText("Welcome to My Private Finances")).not.toBeInTheDocument();
    expect(screen.getByText("My Finances")).toBeInTheDocument();
  });
});
