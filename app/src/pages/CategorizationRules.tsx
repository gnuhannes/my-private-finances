import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { useCategories } from "../hooks/useCategories";
import {
  createRule,
  deleteRule,
  reorderRules,
  applyRules,
  type RuleCreate,
  type ApplyResult,
} from "../lib/api/categorization-rules";
import styles from "./CategorizationRules.module.css";

const TEXT_OPERATOR_VALUES = ["contains", "exact", "starts_with", "ends_with"] as const;
const AMOUNT_OPERATOR_VALUES = ["gt", "gte", "lt", "lte", "eq"] as const;
const FIELD_VALUES = ["payee", "purpose", "amount"] as const;

function operatorsForField(field: string): readonly string[] {
  return field === "amount" ? AMOUNT_OPERATOR_VALUES : TEXT_OPERATOR_VALUES;
}

export default function CategorizationRules() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: rules, isLoading, error } = useCategorizationRules();
  const { data: categories } = useCategories();

  const [field, setField] = useState("payee");
  const [operator, setOperator] = useState("contains");
  const [value, setValue] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categorization-rules"] });

  const addMutation = useMutation({
    mutationFn: createRule,
    onSuccess: () => {
      setValue("");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: reorderRules,
    onSuccess: invalidate,
  });

  const applyMutation = useMutation({
    mutationFn: applyRules,
    onSuccess: (result) => {
      setApplyResult(result);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const handleFieldChange = (newField: string) => {
    setField(newField);
    const ops = operatorsForField(newField);
    setOperator(ops[0]);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || categoryId === null) return;
    const data: RuleCreate = {
      field,
      operator,
      value: value.trim(),
      category_id: categoryId,
    };
    addMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Delete this rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (!rules) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const ids = rules.map((r) => r.id);
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    reorderMutation.mutate(ids);
  };

  const categoryName = (catId: number): string =>
    categories?.find((c) => c.id === catId)?.name ?? `#${catId}`;

  const fieldLabel = (f: string): string => t(`rules.fields.${f}`, { defaultValue: f });

  const operatorLabel = (op: string): string => t(`rules.operators.${op}`, { defaultValue: op });

  if (isLoading) return <div className={styles.status}>{t("rules.loading")}</div>;
  if (error) return <div className={styles.error}>{t("rules.failed")}</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("rules.title")}</h1>
      <p className={styles.subtitle}>{t("rules.subtitle")}</p>

      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? t("rules.applying") : t("rules.applyToUncategorized")}
        </button>
        {applyResult !== null && (
          <span className={styles.applyResult}>
            {t("rules.categorized", { count: applyResult.categorized })}
          </span>
        )}
      </div>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label>{t("rules.fieldLabel")}</label>
          <select value={field} onChange={(e) => handleFieldChange(e.target.value)}>
            {FIELD_VALUES.map((f) => (
              <option key={f} value={f}>
                {fieldLabel(f)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>{t("rules.operatorLabel")}</label>
          <select value={operator} onChange={(e) => setOperator(e.target.value)}>
            {operatorsForField(field).map((op) => (
              <option key={op} value={op}>
                {operatorLabel(op)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>{t("rules.valueLabel")}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              field === "amount"
                ? t("rules.valuePlaceholderAmount")
                : t("rules.valuePlaceholderText")
            }
            required
          />
        </div>
        <div className={styles.field}>
          <label>{t("common.category")}</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value === "" ? null : Number(e.target.value))}
            required
          >
            <option value="">{t("rules.selectCategory")}</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={addMutation.isPending}>
          {t("rules.addRule")}
        </button>
      </form>

      {rules && rules.length === 0 && <p className={styles.empty}>{t("rules.noRules")}</p>}

      {rules && rules.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.positionCol}>{t("rules.tablePosition")}</th>
              <th>{t("rules.tableField")}</th>
              <th>{t("rules.tableOperator")}</th>
              <th>{t("rules.tableValue")}</th>
              <th>{t("rules.tableCategory")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={rule.id}>
                <td className={styles.positionCol}>{rule.position}</td>
                <td>{fieldLabel(rule.field)}</td>
                <td>{operatorLabel(rule.operator)}</td>
                <td>{rule.value}</td>
                <td>{categoryName(rule.category_id)}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      title={t("rules.moveUp")}
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      onClick={() => handleMove(index, 1)}
                      disabled={index === rules.length - 1}
                      title={t("rules.moveDown")}
                    >
                      &#9660;
                    </button>
                    <button type="button" onClick={() => handleDelete(rule.id)}>
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
