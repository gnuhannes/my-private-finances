import { apiGet } from "./client";

export type MonthSummary = {
  month: string; // "YYYY-MM"
  income: string;
  expenses: string;
  net: string;
  savings_rate: string; // percentage, e.g. "28.50"
};

export type AnnualReport = {
  year: number;
  account_id: number | null;
  currency: string;
  total_income: string;
  total_expenses: string;
  total_net: string;
  avg_savings_rate: string;
  months: MonthSummary[];
};

export function getAnnualReport(year: number, accountId?: number | "all"): Promise<AnnualReport> {
  const params = new URLSearchParams();
  params.set("year", String(year));
  if (accountId !== undefined && accountId !== "all") {
    params.set("account_id", String(accountId));
  }
  return apiGet<AnnualReport>(`/api/reports/annual?${params.toString()}`);
}
