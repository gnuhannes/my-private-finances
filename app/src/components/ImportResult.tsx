import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImportResult as ImportResultType, ImportErrorDetail } from "../lib/api";
import styles from "./ImportResult.module.css";

export type ImportContext = {
  mode: "csv";
  fileName?: string;
  accountId?: number;
  delimiter?: string;
  dateFormat?: string;
  decimalComma?: boolean;
};

type Props = {
  result: ImportResultType;
  importContext?: ImportContext;
};

function buildReport(result: ImportResultType, ctx?: ImportContext): string {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const lines: string[] = [`Import Error Report — ${ts}`, "=".repeat(40)];
  if (ctx) {
    lines.push(`Mode:     ${ctx.mode.toUpperCase()}`);
    if (ctx.fileName) lines.push(`File:     ${ctx.fileName}`);
    if (ctx.accountId != null) lines.push(`Account:  ${ctx.accountId}`);
    if (ctx.mode === "csv") {
      lines.push(
        `Settings: delimiter="${ctx.delimiter ?? ","}", date_format="${ctx.dateFormat ?? "iso"}", decimal_comma=${ctx.decimalComma ?? false}`,
      );
    }
    lines.push("");
  }
  lines.push(
    `Results:  ${result.total_rows} rows total | ${result.created} created | ${result.duplicates} duplicates | ${result.failed} failed`,
    "",
    "Errors:",
  );
  for (const err of result.errors) {
    const loc = err.row != null ? `Row ${err.row}` : "—";
    const field = err.field ? ` | field: ${err.field}` : "";
    const raw = err.raw_value != null ? ` | value: "${err.raw_value}"` : "";
    lines.push(`- ${loc}${field}${raw} | ${err.message}`);
    if (err.hint) lines.push(`  Hint: ${err.hint}`);
    if (err.unexpected) lines.push("  [unexpected — please report this]");
  }
  if (result.errors_truncated) {
    lines.push(
      `... (only first ${result.errors.length} errors shown; ${result.failed} rows failed total)`,
    );
  }
  return lines.join("\n");
}

function ErrorItem({ err }: { err: ImportErrorDetail }) {
  const { t } = useTranslation();
  return (
    <li className={`${styles.errorItem} ${err.unexpected ? styles.unexpected : ""}`}>
      <div className={styles.errorMeta}>
        {err.row != null && <span className={styles.errorMetaTag}>Row {err.row}</span>}
        {err.field && <span className={styles.errorMetaTag}>{err.field}</span>}
        {err.unexpected && (
          <span className={styles.errorMetaTag}>{t("importResult.unexpected")}</span>
        )}
      </div>
      <div className={styles.errorMessage}>{err.message}</div>
      {err.raw_value != null && <div className={styles.errorRaw}>"{err.raw_value}"</div>}
      {err.hint && <div className={styles.errorHint}>{err.hint}</div>}
    </li>
  );
}

export function ImportResult({ result, importContext }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const report = buildReport(result, importContext);
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.kpis}>
        <span className={styles.kpi}>
          <span className={styles.kpiLabel}>{t("importResult.totalRows")}</span>
          <span className={styles.kpiValue}>{result.total_rows}</span>
        </span>
        <span className={`${styles.kpi} ${styles.created}`}>
          <span className={styles.kpiLabel}>{t("importResult.created")}</span>
          <span className={styles.kpiValue}>{result.created}</span>
        </span>
        <span className={`${styles.kpi} ${styles.duplicates}`}>
          <span className={styles.kpiLabel}>{t("importResult.duplicates")}</span>
          <span className={styles.kpiValue}>{result.duplicates}</span>
        </span>
        <span className={`${styles.kpi} ${styles.failed}`}>
          <span className={styles.kpiLabel}>{t("importResult.failed")}</span>
          <span className={styles.kpiValue}>{result.failed}</span>
        </span>
      </div>

      {result.errors.length > 0 && (
        <div className={styles.errors}>
          <div className={styles.errorsHeader}>
            <strong>{t("importResult.errors")}</strong>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {copied ? t("importResult.copied") : t("importResult.copyReport")}
            </button>
          </div>
          <ul className={styles.errorList}>
            {result.errors.map((err, i) => (
              <ErrorItem key={i} err={err} />
            ))}
          </ul>
          {result.errors_truncated && (
            <div className={styles.truncationNotice}>
              {t("importResult.truncated", { failed: result.failed, shown: result.errors.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
