import { useCallback, useState } from "react";
import { ImportDialog } from "../components/ImportDialog";
import styles from "./Import.module.css";

export default function Import() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClose = useCallback(() => setDialogOpen(false), []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Import</h1>
      <p className={styles.subtitle}>Import transactions from CSV bank statements.</p>

      <button className={styles.importBtn} onClick={() => setDialogOpen(true)}>
        Import CSV
      </button>

      <ImportDialog open={dialogOpen} onClose={handleClose} />
    </div>
  );
}
