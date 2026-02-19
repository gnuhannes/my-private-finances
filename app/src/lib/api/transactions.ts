import { apiGet, apiPatch } from "./client";

export type TransactionItem = {
  id: number;
  account_id: number;
  booking_date: string;
  amount: string;
  currency: string;
  payee: string | null;
  purpose: string | null;
  category_id: number | null;
  external_id: string | null;
  import_source: string | null;
  import_hash: string;
};

export type TransactionListResponse = {
  items: TransactionItem[];
  total: number;
};

export type TransactionParams = {
  accountId: number | "all";
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  categoryFilter?: string;
  q?: string;
  amountMin?: string;
  amountMax?: string;
};

export function getTransactions(params: TransactionParams): Promise<TransactionListResponse> {
  const qs = new URLSearchParams();

  if (params.accountId !== "all") qs.set("account_id", String(params.accountId));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (params.categoryFilter) qs.set("category_filter", params.categoryFilter);
  if (params.q) qs.set("q", params.q);
  if (params.amountMin) qs.set("amount_min", params.amountMin);
  if (params.amountMax) qs.set("amount_max", params.amountMax);

  return apiGet<TransactionListResponse>(`/api/transactions?${qs.toString()}`);
}

export function updateTransactionCategory(
  id: number,
  categoryId: number | null,
): Promise<TransactionItem> {
  return apiPatch<TransactionItem>(`/api/transactions/${id}`, {
    category_id: categoryId,
  });
}
