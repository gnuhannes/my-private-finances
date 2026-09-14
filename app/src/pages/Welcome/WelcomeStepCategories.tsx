import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateCategoriesBatch } from "../../hooks/useCategories";
import type { CategoryCreate, CostType } from "../../lib/api/categories";
import styles from "./WelcomeWizard.module.css";

type StarterGroup = "fixed" | "variable" | "income";

const GROUPS: StarterGroup[] = ["fixed", "variable", "income"];

const GROUP_HEADING_KEY: Record<StarterGroup, string> = {
  fixed: "categories.starterGroupFixed",
  variable: "categories.starterGroupVariable",
  income: "categories.starterGroupIncome",
};

function costTypeForGroup(group: StarterGroup): CostType | null {
  return group === "income" ? null : group;
}

type CustomRow = { id: number; name: string; costType: CostType | null };

let customRowSeq = 0;

export function WelcomeStepCategories() {
  const { t } = useTranslation();
  const createBatch = useCreateCategoriesBatch();

  const starterItems = GROUPS.flatMap((group) => {
    const items = t(`categories.starter.${group}`, {
      returnObjects: true,
    }) as unknown as Record<string, string>;
    return Object.entries(items).map(([itemKey, label]) => ({
      id: `${group}.${itemKey}`,
      group,
      label,
    }));
  });

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(starterItems.map((item) => [item.id, true])),
  );
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    setSubmitted(false);
  }

  function addRow() {
    setCustomRows((rows) => [...rows, { id: customRowSeq++, name: "", costType: null }]);
    setSubmitted(false);
  }

  function updateRow(id: number, patch: Partial<CustomRow>) {
    setCustomRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSubmitted(false);
  }

  function removeRow(id: number) {
    setCustomRows((rows) => rows.filter((r) => r.id !== id));
    setSubmitted(false);
  }

  function handleSubmit() {
    const picked: CategoryCreate[] = starterItems
      .filter((item) => selected[item.id])
      .map((item) => ({ name: item.label, cost_type: costTypeForGroup(item.group) }));

    const custom: CategoryCreate[] = customRows
      .filter((row) => row.name.trim() !== "")
      .map((row) => ({ name: row.name.trim(), cost_type: row.costType }));

    const payload = [...picked, ...custom];
    if (payload.length === 0) return;

    createBatch.mutate(payload, { onSuccess: () => setSubmitted(true) });
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>{t("welcome.categoriesTitle")}</h2>
      <p className={styles.stepCopy}>{t("welcome.categoriesCopy")}</p>

      {GROUPS.map((group) => (
        <div key={group}>
          <h3 className={styles.groupHeading}>{t(GROUP_HEADING_KEY[group])}</h3>
          <ul className={styles.checkboxList}>
            {starterItems
              .filter((item) => item.group === group)
              .map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!selected[item.id]}
                      onChange={() => toggle(item.id)}
                    />
                    {item.label}
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}

      <h3 className={styles.groupHeading}>{t("categories.addOwnTitle")}</h3>
      <div className={styles.customRows}>
        {customRows.map((row) => (
          <div key={row.id} className={styles.customRow}>
            <input
              value={row.name}
              placeholder={t("categories.addOwnPlaceholder")}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
            />
            <select
              value={row.costType ?? ""}
              onChange={(e) =>
                updateRow(row.id, {
                  costType: e.target.value === "" ? null : (e.target.value as CostType),
                })
              }
            >
              <option value="">{t("categories.unclassified")}</option>
              <option value="fixed">{t("categories.fixed")}</option>
              <option value="variable">{t("categories.variable")}</option>
            </select>
            <button type="button" onClick={() => removeRow(row.id)}>
              {t("categories.addOwnRemove")}
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow}>
          {t("categories.addOwnAdd")}
        </button>
      </div>

      <div className={styles.stepActions}>
        <button type="button" onClick={handleSubmit} disabled={createBatch.isPending}>
          {t("welcome.categoriesSubmit")}
        </button>
        {submitted && (
          <span className={styles.confirmation}>{t("welcome.categoriesSubmitted")}</span>
        )}
      </div>
    </div>
  );
}
