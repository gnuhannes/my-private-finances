import { apiGet } from "./client";

export type AccountBalancePoint = {
  account_id: number;
  balance: string;
};

export type NetWorthPoint = {
  month: string; // "YYYY-MM"
  total: string;
  by_account: AccountBalancePoint[];
};

export type AccountNetWorthSummary = {
  account_id: number;
  account_name: string;
  currency: string;
  opening_balance: string;
  opening_balance_date: string;
  current_balance: string;
  month_over_month_change: string;
};

export type NetWorthReport = {
  currency: string;
  current_total: string;
  month_over_month_change: string;
  accounts: AccountNetWorthSummary[];
  history: NetWorthPoint[];
};

export function getNetWorth(months: number = 12): Promise<NetWorthReport> {
  return apiGet<NetWorthReport>(`/api/reports/net-worth?months=${months}`);
}
