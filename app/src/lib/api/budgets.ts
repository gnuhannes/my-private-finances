import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type Budget = {
  id: number;
  category_id: number;
  category_name: string;
  amount: string;
};

export type BudgetCreate = {
  category_id: number;
  amount: string;
};

export type BudgetUpdate = {
  amount?: string;
};

export function getBudgets(): Promise<Budget[]> {
  return apiGet<Budget[]>("/api/budgets");
}

export function createBudget(data: BudgetCreate): Promise<Budget> {
  return apiPost<Budget>("/api/budgets", data);
}

export function updateBudget(id: number, data: BudgetUpdate): Promise<Budget> {
  return apiPatch<Budget>(`/api/budgets/${id}`, data);
}

export function deleteBudget(id: number): Promise<void> {
  return apiDelete(`/api/budgets/${id}`);
}
