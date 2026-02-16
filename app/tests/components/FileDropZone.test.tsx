import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileDropZone } from "../../src/components/FileDropZone";

describe("FileDropZone", () => {
  it("shows placeholder when no file is selected", () => {
    render(<FileDropZone onFile={vi.fn()} file={null} />);

    expect(screen.getByText("Drop a CSV file here or click to browse")).toBeInTheDocument();
  });

  it("shows file name and size when a file is selected", () => {
    const file = new File(["content"], "test.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 2048 });

    render(<FileDropZone onFile={vi.fn()} file={file} />);

    expect(screen.getByText("test.csv (2.0 KB)")).toBeInTheDocument();
  });

  it("shows size in bytes for small files", () => {
    const file = new File(["hi"], "tiny.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 500 });

    render(<FileDropZone onFile={vi.fn()} file={file} />);

    expect(screen.getByText("tiny.csv (500 B)")).toBeInTheDocument();
  });

  it("calls onFile when a file is selected via input", () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile} file={null} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "upload.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("calls onFile when a file is dropped", () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile} file={null} />);

    const zone = screen.getByText("Drop a CSV file here or click to browse").closest("div")!;
    const file = new File(["data"], "dropped.csv", { type: "text/csv" });

    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    });

    expect(onFile).toHaveBeenCalledWith(file);
  });
});
