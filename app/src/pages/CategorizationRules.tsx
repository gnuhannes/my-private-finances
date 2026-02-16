import { useState } from "react";
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

const TEXT_OPERATORS = [
  { value: "contains", label: "contains" },
  { value: "exact", label: "exact" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
];

const AMOUNT_OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
];

const FIELDS = [
  { value: "payee", label: "Payee" },
  { value: "purpose", label: "Purpose" },
  { value: "amount", label: "Amount" },
];

function operatorsForField(field: string) {
  return field === "amount" ? AMOUNT_OPERATORS : TEXT_OPERATORS;
}

export default function CategorizationRules() {
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
    setOperator(ops[0].value);
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

  const operatorLabel = (op: string): string => {
    const all = [...TEXT_OPERATORS, ...AMOUNT_OPERATORS];
    return all.find((o) => o.value === op)?.label ?? op;
  };

  if (isLoading) return <div className={styles.status}>Loading rules...</div>;
  if (error) return <div className={styles.error}>Failed to load rules.</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Categorization Rules</h1>
      <p className={styles.subtitle}>
        Define rules to auto-categorize transactions. Rules are applied in priority order (first
        match wins).
      </p>

      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? "Applying..." : "Apply to uncategorized"}
        </button>
        {applyResult !== null && (
          <span className={styles.applyResult}>
            {applyResult.categorized} transaction
            {applyResult.categorized !== 1 ? "s" : ""} categorized.
          </span>
        )}
      </div>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label>Field</label>
          <select value={field} onChange={(e) => handleFieldChange(e.target.value)}>
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>Operator</label>
          <select value={operator} onChange={(e) => setOperator(e.target.value)}>
            {operatorsForField(field).map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field === "amount" ? "e.g. 100.00" : "e.g. REWE"}
            required
          />
        </div>
        <div className={styles.field}>
          <label>Category</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value === "" ? null : Number(e.target.value))}
            required
          >
            <option value="">Select...</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={addMutation.isPending}>
          Add Rule
        </button>
      </form>

      {rules && rules.length === 0 && (
        <p className={styles.empty}>No rules yet. Create one above.</p>
      )}

      {rules && rules.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.positionCol}>#</th>
              <th>Field</th>
              <th>Operator</th>
              <th>Value</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={rule.id}>
                <td className={styles.positionCol}>{rule.position}</td>
                <td>{FIELDS.find((f) => f.value === rule.field)?.label ?? rule.field}</td>
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
                      title="Move up"
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      onClick={() => handleMove(index, 1)}
                      disabled={index === rules.length - 1}
                      title="Move down"
                    >
                      &#9660;
                    </button>
                    <button type="button" onClick={() => handleDelete(rule.id)}>
                      Delete
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
