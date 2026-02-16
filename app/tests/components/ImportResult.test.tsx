import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImportResult } from "../../src/components/ImportResult";
import type { ImportResult as ImportResultType } from "../../src/lib/api";

const successResult: ImportResultType = {
  total_rows: 10,
  created: 8,
  duplicates: 2,
  failed: 0,
  errors: [],
};

const resultWithErrors: ImportResultType = {
  total_rows: 5,
  created: 2,
  duplicates: 1,
  failed: 2,
  errors: ["Row 3: invalid date format", "Row 5: missing amount"],
};

describe("ImportResult", () => {
  it("renders all KPI values", () => {
    render(<ImportResult result={successResult} />);

    expect(screen.getByText("Total rows")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Duplicates")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("does not render error list when there are no errors", () => {
    render(<ImportResult result={successResult} />);

    expect(screen.queryByText("Errors:")).not.toBeInTheDocument();
  });

  it("renders error list when there are errors", () => {
    render(<ImportResult result={resultWithErrors} />);

    expect(screen.getByText("Errors:")).toBeInTheDocument();
    expect(screen.getByText("Row 3: invalid date format")).toBeInTheDocument();
    expect(screen.getByText("Row 5: missing amount")).toBeInTheDocument();
  });
});
