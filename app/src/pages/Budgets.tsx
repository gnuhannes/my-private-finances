import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { createBudget, updateBudget, deleteBudget, type Budget } from "../lib/api/budgets";
import styles from "./Budgets.module.css";

export default function Budgets() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: budgets, isLoading, error } = useBudgets();
  const { data: categories } = useCategories();

  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["budgets"] });

  const addMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      setNewCategoryId(null);
      setNewAmount("");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: string }) => updateBudget(id, { amount }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: invalidate,
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryId === null || !newAmount.trim()) return;
    addMutation.mutate({ category_id: newCategoryId, amount: newAmount.trim() });
  };

  const startEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setEditAmount(budget.amount);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter") {
      updateMutation.mutate({ id, amount: editAmount.trim() });
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleDelete = (budget: Budget) => {
    if (window.confirm(`Delete budget for "${budget.category_name}"?`)) {
      deleteMutation.mutate(budget.id);
    }
  };

  // Categories that don't already have a budget
  const usedCategoryIds = new Set(budgets?.map((b) => b.category_id) ?? []);
  const availableCategories = categories?.filter((c) => !usedCategoryIds.has(c.id)) ?? [];

  if (isLoading) return <div className={styles.status}>{t("budgets.loading")}</div>;
  if (error) return <div className={styles.error}>{t("budgets.failed")}</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("budgets.title")}</h1>
      <p className={styles.subtitle}>{t("budgets.subtitle")}</p>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label>{t("common.category")}</label>
          <select
            value={newCategoryId ?? ""}
            onChange={(e) =>
              setNewCategoryId(e.target.value === "" ? null : Number(e.target.value))
            }
            required
          >
            <option value="">{t("budgets.selectCategory")}</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>{t("budgets.monthlyLimit")}</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder={t("budgets.limitPlaceholder")}
            required
          />
        </div>
        <button type="submit" disabled={addMutation.isPending}>
          {t("common.add")}
        </button>
      </form>

      {budgets && budgets.length === 0 && (
        <p className={styles.empty}>{t("budgets.noBudgets")}</p>
      )}

      {budgets && budgets.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("budgets.tableCategory")}</th>
              <th className={styles.amount}>{t("budgets.tableMonthlyLimit")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr key={budget.id}>
                <td>{budget.category_name}</td>
                <td className={styles.amount}>
                  {editingId === budget.id ? (
                    <input
                      className={styles.editInput}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, budget.id)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                    />
                  ) : (
                    budget.amount
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => startEdit(budget)}>
                      {t("common.edit")}
                    </button>
                    <button type="button" onClick={() => handleDelete(budget)}>
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
