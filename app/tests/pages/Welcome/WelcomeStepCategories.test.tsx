import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { WelcomeStepCategories } from "../../../src/pages/Welcome/WelcomeStepCategories";

const createBatchMutate = vi.fn((_payload: unknown[], opts?: { onSuccess?: () => void }) => {
  opts?.onSuccess?.();
});

vi.mock("../../../src/hooks/useCategories", () => ({
  useCreateCategoriesBatch: () => ({ mutate: createBatchMutate, isPending: false }),
}));

function renderStep() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WelcomeStepCategories />
    </QueryClientProvider>,
  );
}

describe("WelcomeStepCategories", () => {
  beforeEach(() => {
    createBatchMutate.mockClear();
  });

  it("preselects the starter categories", () => {
    renderStep();
    expect(screen.getByLabelText("Rent")).toBeChecked();
    expect(screen.getByLabelText("Salary")).toBeChecked();
  });

  it("submits the preselected set via the batch endpoint", () => {
    renderStep();
    fireEvent.click(screen.getByText("Add selected categories"));

    expect(createBatchMutate).toHaveBeenCalledTimes(1);
    const [payload] = createBatchMutate.mock.calls[0];
    expect(payload).toEqual(
      expect.arrayContaining([
        { name: "Rent", cost_type: "fixed" },
        { name: "Salary", cost_type: null },
      ]),
    );
    expect(screen.getByText("Categories added.")).toBeInTheDocument();
  });

  it("unchecking an item removes it from the submitted payload", () => {
    renderStep();
    fireEvent.click(screen.getByLabelText("Rent"));
    fireEvent.click(screen.getByText("Add selected categories"));

    const [payload] = createBatchMutate.mock.calls[0] as [Array<{ name: string }>];
    expect(payload.some((c) => c.name === "Rent")).toBe(false);
  });

  it("supports adding a custom category row", () => {
    renderStep();
    fireEvent.click(screen.getByText("Add row"));
    fireEvent.change(screen.getByPlaceholderText("Category name"), {
      target: { value: "Hobbies" },
    });
    fireEvent.click(screen.getByText("Add selected categories"));

    const [payload] = createBatchMutate.mock.calls[0] as [Array<{ name: string }>];
    expect(payload.some((c) => c.name === "Hobbies")).toBe(true);
  });

  it("does not submit when nothing is selected and there are no custom rows", () => {
    renderStep();
    // Uncheck everything.
    screen.getAllByRole("checkbox").forEach((cb) => fireEvent.click(cb));
    fireEvent.click(screen.getByText("Add selected categories"));

    expect(createBatchMutate).not.toHaveBeenCalled();
  });
});
