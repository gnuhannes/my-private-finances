import { apiGet } from "./client";

export type CategoryTrendItem = {
  category_name: string | null;
  avg_monthly: string;
  current_month: string;
  projected: string;
};

export type SpendingTrendReport = {
  account_id: number | null;
  month: string;
  lookback_months: number;
  currency: string;
  total_avg_monthly: string;
  total_current_month: string;
  total_projected: string;
  categories: CategoryTrendItem[];
};

export function getSpendingTrend(
  lookbackMonths: number,
  accountId?: number | "all",
  month?: string,
): Promise<SpendingTrendReport> {
  const params = new URLSearchParams();
  params.set("lookback_months", String(lookbackMonths));
  if (accountId !== undefined && accountId !== "all") {
    params.set("account_id", String(accountId));
  }
  if (month) {
    params.set("month", month);
  }
  return apiGet<SpendingTrendReport>(`/api/reports/spending-trend?${params.toString()}`);
}
