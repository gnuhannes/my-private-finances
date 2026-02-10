import { apiGet } from "./client";

export type PayeeTotal = {
  payee: string | null;
  total: string;
};

export type MonthlyReport = {
  account_id: number;
  month: string;
  currency: string;

  transactions_count: number;

  income_total: string;
  expense_total: string;
  net_total: string;

  top_payees: PayeeTotal[];
};

export function getMonthlyReport(params: {
  accountId: number;
  month: string;
}): Promise<MonthlyReport> {
  const q = new URLSearchParams({
    account_id: String(params.accountId),
    month: params.month,
  });

  return apiGet<MonthlyReport>(`/api/reports/monthly?${q.toString()}`);
}
