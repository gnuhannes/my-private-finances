import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "../../src/components/Pagination";

describe("Pagination", () => {
  it("shows page info and buttons", () => {
    render(
      <Pagination page={2} totalPages={5} total={230} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );

    expect(screen.getByText("Page 2 of 5 (230 transactions)")).toBeInTheDocument();
    expect(screen.getByText("Previous")).not.toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("disables Previous on first page", () => {
    render(
      <Pagination page={1} totalPages={3} total={150} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );

    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("disables Next on last page", () => {
    render(
      <Pagination page={3} totalPages={3} total={150} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );

    expect(screen.getByText("Previous")).not.toBeDisabled();
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("returns null when single page", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={10} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
