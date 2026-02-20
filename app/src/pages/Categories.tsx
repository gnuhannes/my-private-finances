import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories } from "../hooks/useCategories";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CostType,
} from "../lib/api/categories";
import styles from "./Categories.module.css";

export default function Categories() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: categories, isLoading, error } = useCategories();

  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [newCostType, setNewCostType] = useState<CostType | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCostType, setEditCostType] = useState<CostType | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const addMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      setNewName("");
      setNewParentId(null);
      setNewCostType(null);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; cost_type?: CostType | null }) =>
      updateCategory(id, data),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addMutation.mutate({
      name: newName.trim(),
      parent_id: newParentId,
      cost_type: newCostType,
    });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditCostType(cat.cost_type);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter") {
      updateMutation.mutate({
        id,
        name: editName.trim(),
        cost_type: editCostType,
      });
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleEditSave = (id: number) => {
    updateMutation.mutate({
      id,
      name: editName.trim(),
      cost_type: editCostType,
    });
  };

  const handleDelete = (cat: Category) => {
    if (window.confirm(`Delete category "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  const parentName = (parentId: number | null): string => {
    if (parentId === null) return "";
    return categories?.find((c) => c.id === parentId)?.name ?? `#${parentId}`;
  };

  const costTypeLabel = (ct: CostType | null): string => {
    if (ct === "fixed") return t("categories.fixed");
    if (ct === "variable") return t("categories.variable");
    return "";
  };

  if (isLoading) return <div className={styles.status}>{t("categories.loading")}</div>;
  if (error) return <div className={styles.error}>{t("categories.failed")}</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("categories.title")}</h1>
      <p className={styles.subtitle}>{t("categories.subtitle")}</p>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.field}>
          <label>{t("common.name")}</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("categories.categoryNamePlaceholder")}
            required
          />
        </div>
        <div className={styles.field}>
          <label>{t("categories.parent")}</label>
          <select
            value={newParentId ?? ""}
            onChange={(e) => setNewParentId(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">{t("categories.none")}</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>{t("categories.costType")}</label>
          <select
            value={newCostType ?? ""}
            onChange={(e) =>
              setNewCostType(e.target.value === "" ? null : (e.target.value as CostType))
            }
          >
            <option value="">{t("categories.unclassified")}</option>
            <option value="fixed">{t("categories.fixed")}</option>
            <option value="variable">{t("categories.variable")}</option>
          </select>
        </div>
        <button type="submit" disabled={addMutation.isPending}>
          {t("common.add")}
        </button>
      </form>

      {categories && categories.length === 0 && (
        <p className={styles.empty}>{t("categories.noCategories")}</p>
      )}

      {categories && categories.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("categories.tableParent")}</th>
              <th>{t("categories.tableCostType")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>
                  {editingId === cat.id ? (
                    <input
                      className={styles.editInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, cat.id)}
                      autoFocus
                    />
                  ) : (
                    cat.name
                  )}
                </td>
                <td>{parentName(cat.parent_id)}</td>
                <td>
                  {editingId === cat.id ? (
                    <select
                      value={editCostType ?? ""}
                      onChange={(e) =>
                        setEditCostType(e.target.value === "" ? null : (e.target.value as CostType))
                      }
                    >
                      <option value="">{t("categories.unclassified")}</option>
                      <option value="fixed">{t("categories.fixed")}</option>
                      <option value="variable">{t("categories.variable")}</option>
                    </select>
                  ) : (
                    costTypeLabel(cat.cost_type)
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    {editingId === cat.id ? (
                      <>
                        <button type="button" onClick={() => handleEditSave(cat.id)}>
                          {t("common.save")}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(cat)}>
                          {t("common.edit")}
                        </button>
                        <button type="button" onClick={() => handleDelete(cat)}>
                          {t("common.delete")}
                        </button>
                      </>
                    )}
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
