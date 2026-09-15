import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileDropZone } from "../../src/components/FileDropZone";
import * as nativeFile from "../../src/lib/desktop/nativeFile";

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

describe("FileDropZone desktop native picker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the native picker instead of the hidden input inside the desktop shell", async () => {
    const file = new File(["data"], "native.csv", { type: "text/csv" });
    vi.spyOn(nativeFile, "isDesktop").mockReturnValue(true);
    const pickSpy = vi.spyOn(nativeFile, "pickNativeFile").mockResolvedValue(file);
    const onFile = vi.fn();

    render(<FileDropZone onFile={onFile} file={null} accept=".csv" />);
    fireEvent.click(screen.getByText("Drop a CSV file here or click to browse"));

    await waitFor(() => expect(onFile).toHaveBeenCalledWith(file));
    expect(pickSpy).toHaveBeenCalledWith(".csv");
  });

  it("does not call onFile when the native picker is cancelled", async () => {
    vi.spyOn(nativeFile, "isDesktop").mockReturnValue(true);
    const pickSpy = vi.spyOn(nativeFile, "pickNativeFile").mockResolvedValue(null);
    const onFile = vi.fn();

    render(<FileDropZone onFile={onFile} file={null} />);
    fireEvent.click(screen.getByText("Drop a CSV file here or click to browse"));

    await waitFor(() => expect(pickSpy).toHaveBeenCalled());
    expect(onFile).not.toHaveBeenCalled();
  });
});
