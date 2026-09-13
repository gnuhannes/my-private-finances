import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../lib/api/categories";
import type { TransactionItem } from "../lib/api/transactions";
import { ApiError } from "../lib/api/client";
import {
  useDeleteTransactionSplits,
  useReplaceTransactionSplits,
  useTransactionSplits,
} from "../hooks/useTransactionSplits";
import { CategorySelect } from "./CategorySelect";
import { formatMoneyString } from "../utils/money";
import {
  amountCentsToPercent,
  centsToMoneyString,
  parseMoneyToCents,
  percentsToAmountCents,
  splitEvenlyCents,
  sumCents,
} from "../domain/splitMath";
import styles from "./SplitTransactionDialog.module.css";

type Mode = "amount" | "percentage";

type Row = {
  key: string;
  categoryId: number | null;
  note: string;
  amountCents: number;
  /** Raw text of the percent input; only meaningful in percentage mode, and
   * only for rows before the last (the last row's percent is a derived
   * display value — it absorbs whatever rounding leftover remains). */
  percentInput: string;
};

let rowKeySeq = 0;
function newRowKey(): string {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function blankRow(): Row {
  return { key: newRowKey(), categoryId: null, note: "", amountCents: 0, percentInput: "0" };
}

function recomputeFromPercents(rows: Row[], totalCents: number): Row[] {
  if (rows.length === 0) return rows;
  const percents = rows.map((r, i) => (i === rows.length - 1 ? 0 : Number(r.percentInput) || 0));
  const amounts = percentsToAmountCents(totalCents, percents);
  return rows.map((r, i) => ({ ...r, amountCents: amounts[i] }));
}

type Props = {
  open: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  categories: Category[];
};

export function SplitTransactionDialog({ open, onClose, transaction, categories }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const transactionId = transaction?.id ?? null;
  const totalCents = transaction ? parseMoneyToCents(transaction.amount) : 0;
  const currency = transaction?.currency ?? "EUR";

  const splitsQuery = useTransactionSplits(transactionId ?? -1, open && transactionId !== null);
  const replaceMutation = useReplaceTransactionSplits();
  const deleteMutation = useDeleteTransactionSplits();

  const [mode, setMode] = useState<Mode>("amount");
  const [rows, setRows] = useState<Row[]>([]);
  // Which transaction's data local `rows` currently reflect — `null` means
  // "not yet hydrated for the currently open transaction".
  const [hydratedFor, setHydratedFor] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Hydrate local `rows` from the existing splits (or two blank rows, for a
  // new split) as soon as the dialog is open, a transaction is set, and its
  // splits have finished loading. This is intentionally done during render
  // (not in an effect) — it's "resetting state when a prop changes" per
  // https://react.dev/learn/you-might-not-need-an-effect, guarded by
  // `hydratedFor` so it only runs once per opened transaction.
  if (open && transactionId !== null && transactionId !== hydratedFor && !splitsQuery.isLoading) {
    const existing = splitsQuery.data ?? [];
    setHydratedFor(transactionId);
    setRows(
      existing.length > 0
        ? existing.map((s) => ({
            key: String(s.id),
            categoryId: s.category_id,
            note: s.note ?? "",
            amountCents: parseMoneyToCents(s.amount),
            percentInput: "0",
          }))
        : [blankRow(), blankRow()],
    );
    setMode("amount");
  }

  const resetForm = () => {
    setRows([]);
    setMode("amount");
    setHydratedFor(null);
    replaceMutation.reset();
    deleteMutation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const setMutationRows = (updater: (rows: Row[]) => Row[]) => {
    setRows((prev) => {
      const next = updater(prev);
      return mode === "percentage" ? recomputeFromPercents(next, totalCents) : next;
    });
  };

  const handleModeChange = (next: Mode) => {
    if (next === mode) return;
    if (next === "percentage") {
      setRows((prev) =>
        prev.map((r, i) =>
          i === prev.length - 1
            ? r
            : { ...r, percentInput: amountCentsToPercent(r.amountCents, totalCents).toFixed(1) },
        ),
      );
    }
    setMode(next);
  };

  const handleAmountChange = (key: string, value: string) => {
    setMutationRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, amountCents: parseMoneyToCents(value) } : r)),
    );
  };

  const handlePercentChange = (key: string, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.key === key ? { ...r, percentInput: value } : r));
      return recomputeFromPercents(next, totalCents);
    });
  };

  const handleCategoryChange = (key: string, categoryId: number | null) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, categoryId } : r)));
  };

  const handleNoteChange = (key: string, note: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, note } : r)));
  };

  const handleAddRow = () => {
    setMutationRows((prev) => [...prev, blankRow()]);
  };

  const handleRemoveRow = (key: string) => {
    setMutationRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleSplitEvenly = () => {
    setRows((prev) => {
      const amounts = splitEvenlyCents(totalCents, prev.length);
      return prev.map((r, i) => ({
        ...r,
        amountCents: amounts[i],
        percentInput: amountCentsToPercent(amounts[i], totalCents).toFixed(1),
      }));
    });
  };

  const allocatedCents = useMemo(() => sumCents(rows.map((r) => r.amountCents)), [rows]);
  const remainingCents = totalCents - allocatedCents;
  const canSave = rows.length >= 2 && remainingCents === 0 && !replaceMutation.isPending;
  const hasExistingSplit = (splitsQuery.data ?? []).length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !canSave) return;
    replaceMutation.mutate(
      {
        transactionId,
        items: rows.map((r) => ({
          category_id: r.categoryId,
          amount: centsToMoneyString(r.amountCents),
          note: r.note.trim() === "" ? null : r.note,
        })),
      },
      { onSuccess: handleClose },
    );
  };

  const handleRemoveSplit = () => {
    if (!transactionId) return;
    deleteMutation.mutate(transactionId, { onSuccess: handleClose });
  };

  const errorMessage = (err: unknown): string =>
    err instanceof ApiError
      ? ((err.body as { detail?: string })?.detail ?? err.message)
      : err instanceof Error
        ? err.message
        : String(err);

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t("split.title")}</h2>
        <button type="button" className={styles.closeBtn} onClick={handleClose}>
          &times;
        </button>
      </div>

      {transaction && (
        <form onSubmit={handleSubmit} className={styles.body}>
          <p className={styles.subtitle}>
            {t("split.transactionAmount", {
              amount: formatMoneyString(transaction.amount, currency),
            })}
          </p>

          <div className={styles.modeToggle} role="radiogroup" aria-label={t("split.mode")}>
            <button
              type="button"
              className={mode === "amount" ? styles.modeActive : styles.modeBtn}
              aria-pressed={mode === "amount"}
              onClick={() => handleModeChange("amount")}
            >
              {t("split.modeAmounts")}
            </button>
            <button
              type="button"
              className={mode === "percentage" ? styles.modeActive : styles.modeBtn}
              aria-pressed={mode === "percentage"}
              onClick={() => handleModeChange("percentage")}
            >
              {t("split.modePercentages")}
            </button>
          </div>

          <div className={styles.rows}>
            {rows.map((row, i) => {
              const isLast = i === rows.length - 1;
              const displayPercent = amountCentsToPercent(row.amountCents, totalCents);
              return (
                <div key={row.key} className={styles.row}>
                  <CategorySelect
                    categories={categories}
                    value={row.categoryId}
                    onChange={(id) => handleCategoryChange(row.key, id)}
                    allowEmpty
                    emptyLabel={t("split.unassigned")}
                    size="sm"
                    className={styles.rowCategory}
                  />

                  {mode === "amount" ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.amountInput}
                      value={centsToMoneyString(row.amountCents)}
                      onChange={(e) => handleAmountChange(row.key, e.target.value)}
                      aria-label={t("split.amount")}
                    />
                  ) : (
                    <div className={styles.percentWrap}>
                      <input
                        type="number"
                        step="0.1"
                        className={styles.percentInput}
                        value={isLast ? displayPercent.toFixed(1) : row.percentInput}
                        onChange={(e) => handlePercentChange(row.key, e.target.value)}
                        disabled={isLast}
                        aria-label={t("split.percent")}
                      />
                      <span className={styles.percentSign}>%</span>
                      <span className={styles.computedAmount}>
                        {formatMoneyString(centsToMoneyString(row.amountCents), currency)}
                      </span>
                    </div>
                  )}

                  <input
                    type="text"
                    className={styles.noteInput}
                    placeholder={t("split.notePlaceholder")}
                    value={row.note}
                    onChange={(e) => handleNoteChange(row.key, e.target.value)}
                    aria-label={t("split.note")}
                  />

                  <button
                    type="button"
                    className={styles.removeRowBtn}
                    onClick={() => handleRemoveRow(row.key)}
                    disabled={rows.length <= 1}
                    aria-label={t("split.removeRow")}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>

          <div className={styles.rowActions}>
            <button type="button" onClick={handleAddRow}>
              {t("split.addRow")}
            </button>
            <button type="button" onClick={handleSplitEvenly}>
              {t("split.splitEvenly")}
            </button>
          </div>

          <p className={remainingCents === 0 ? styles.statusOk : styles.statusPending}>
            {t("split.status", {
              allocated: formatMoneyString(centsToMoneyString(allocatedCents), currency),
              total: formatMoneyString(centsToMoneyString(totalCents), currency),
              remaining: formatMoneyString(centsToMoneyString(remainingCents), currency),
            })}
          </p>

          {replaceMutation.isError && (
            <div className={styles.error}>
              {t("split.saveFailed", { error: errorMessage(replaceMutation.error) })}
            </div>
          )}
          {deleteMutation.isError && (
            <div className={styles.error}>
              {t("split.removeFailed", { error: errorMessage(deleteMutation.error) })}
            </div>
          )}

          <div className={styles.actions}>
            {hasExistingSplit && (
              <button
                type="button"
                className={styles.removeSplitBtn}
                onClick={handleRemoveSplit}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t("split.removing") : t("split.removeSplit")}
              </button>
            )}
            <div className={styles.actionsRight}>
              <button type="button" onClick={handleClose}>
                {t("split.cancel")}
              </button>
              <button type="submit" disabled={!canSave}>
                {replaceMutation.isPending ? t("split.saving") : t("split.save")}
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
}
