import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImportDialog } from "../components/ImportDialog";
import styles from "./Import.module.css";

export default function Import() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClose = useCallback(() => setDialogOpen(false), []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("import.title")}</h1>
      <p className={styles.subtitle}>{t("import.subtitle")}</p>

      <button className={styles.importBtn} onClick={() => setDialogOpen(true)}>
        {t("import.importCsvBtn")}
      </button>

      <ImportDialog open={dialogOpen} onClose={handleClose} />
    </div>
  );
}
