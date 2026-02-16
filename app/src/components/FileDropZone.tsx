import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";
import styles from "./FileDropZone.module.css";

type Props = {
  onFile: (file: File) => void;
  accept?: string;
  file: File | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function FileDropZone({ onFile, accept = ".csv", file }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [onFile],
  );

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
  };

  const zoneClass = [styles.zone, dragging && styles.dragging, file && styles.hasFile]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={zoneClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className={styles.input}
      />
      {file ? (
        <span className={styles.fileInfo}>
          {file.name} ({formatSize(file.size)})
        </span>
      ) : (
        <span className={styles.placeholder}>Drop a CSV file here or click to browse</span>
      )}
    </div>
  );
}
