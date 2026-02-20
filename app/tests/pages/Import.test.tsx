import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Import from "../../src/pages/Import";

vi.mock("../../src/hooks/useAccounts", () => ({
  useAccounts: () => ({
    data: [{ id: 1, name: "Main", currency: "EUR" }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../src/hooks/useImportCsv", () => ({
  useImportCsv: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock("../../src/hooks/useImportPdf", () => ({
  useImportPdf: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
    reset: vi.fn(),
  }),
}));

describe("Import", () => {
  it("renders page title and subtitle", () => {
    render(
      <MemoryRouter>
        <Import />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Import" })).toBeInTheDocument();
    expect(screen.getByText("Import transactions from CSV bank statements.")).toBeInTheDocument();
  });

  it("renders the Import CSV trigger button", () => {
    render(
      <MemoryRouter>
        <Import />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByText("Import CSV");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the dialog with form fields", () => {
    render(
      <MemoryRouter>
        <Import />
      </MemoryRouter>,
    );

    expect(screen.getByText("Import", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("PDF (Trade Republic)")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Delimiter")).toBeInTheDocument();
    expect(screen.getByText("Date format")).toBeInTheDocument();
    expect(screen.getByText("Decimal comma")).toBeInTheDocument();
  });

  it("renders account options in the selector", () => {
    render(
      <MemoryRouter>
        <Import />
      </MemoryRouter>,
    );

    expect(screen.getByText("Select account...")).toBeInTheDocument();
    expect(screen.getByText("#1 — Main (EUR)")).toBeInTheDocument();
  });
});
