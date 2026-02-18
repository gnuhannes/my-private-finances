import { apiGet } from "./client";

export type PayeeTotal = {
  payee: string | null;
  total: string;
};

export type CategoryTotal = {
  category_name: string | null;
  total: string;
};

export type TopSpending = {
  booking_date: string;
  payee: string | null;
  purpose: string | null;
  amount: string;
  category_name: string | null;
};

export type MonthlyReport = {
  account_id: number | null;
  month: string;
  currency: string;

  transactions_count: number;

  income_total: string;
  expense_total: string;
  net_total: string;

  top_payees: PayeeTotal[];
  category_breakdown: CategoryTotal[];
  top_spendings: TopSpending[];
};

export type BudgetComparison = {
  category_id: number;
  category_name: string;
  budgeted: string;
  actual: string;
  remaining: string;
};

export type CostTypeBreakdown = {
  cost_type: string | null;
  total: string;
  category_count: number;
};

export type FixedVsVariableReport = {
  account_id: number | null;
  month: string;
  currency: string;
  fixed_total: string;
  variable_total: string;
  unclassified_total: string;
  breakdown: CostTypeBreakdown[];
};

/** accountId: a number for per-account, or "all" to aggregate all accounts. */
export function getMonthlyReport(params: {
  accountId: number | "all";
  month: string;
}): Promise<MonthlyReport> {
  const q = new URLSearchParams({ month: params.month });
  if (params.accountId !== "all") {
    q.set("account_id", String(params.accountId));
  }
  return apiGet<MonthlyReport>(`/api/reports/monthly?${q.toString()}`);
}

export function getBudgetVsActual(params: {
  accountId: number | "all";
  month: string;
}): Promise<BudgetComparison[]> {
  const q = new URLSearchParams({ month: params.month });
  if (params.accountId !== "all") {
    q.set("account_id", String(params.accountId));
  }
  return apiGet<BudgetComparison[]>(`/api/reports/budget-vs-actual?${q.toString()}`);
}

export function getFixedVsVariable(params: {
  accountId: number | "all";
  month: string;
}): Promise<FixedVsVariableReport> {
  const q = new URLSearchParams({ month: params.month });
  if (params.accountId !== "all") {
    q.set("account_id", String(params.accountId));
  }
  return apiGet<FixedVsVariableReport>(`/api/reports/fixed-vs-variable?${q.toString()}`);
}
