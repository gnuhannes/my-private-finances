import { apiGet, apiPatch, apiPost } from "./client";

export type RecurringPattern = {
  id: number;
  account_id: number;
  payee: string;
  typical_amount: string;
  frequency: string;
  confidence: string;
  last_seen: string;
  occurrence_count: number;
  is_active: boolean;
  user_confirmed: boolean;
  category_id: number | null;
  category_name: string | null;
};

export type RecurringSummary = {
  account_id: number;
  total_monthly_recurring: string;
  pattern_count: number;
  by_frequency: { frequency: string; count: number; total: string }[];
};

export type RecurringPatternUpdate = {
  is_active?: boolean;
  user_confirmed?: boolean;
};

export function getRecurringPatterns(
  accountId: number,
  includeInactive: boolean = false,
): Promise<RecurringPattern[]> {
  const q = new URLSearchParams({
    account_id: String(accountId),
  });
  if (includeInactive) q.set("include_inactive", "true");
  return apiGet<RecurringPattern[]>(`/api/recurring-patterns?${q.toString()}`);
}

export function detectRecurringPatterns(accountId: number): Promise<RecurringPattern[]> {
  const q = new URLSearchParams({ account_id: String(accountId) });
  return apiPost<RecurringPattern[]>(`/api/recurring-patterns/detect?${q.toString()}`, {});
}

export function updateRecurringPattern(
  id: number,
  data: RecurringPatternUpdate,
): Promise<RecurringPattern> {
  return apiPatch<RecurringPattern>(`/api/recurring-patterns/${id}`, data);
}

export function getRecurringSummary(accountId: number): Promise<RecurringSummary> {
  const q = new URLSearchParams({ account_id: String(accountId) });
  return apiGet<RecurringSummary>(`/api/recurring-patterns/summary?${q.toString()}`);
}
