import { apiGet } from "./client";

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
  accountId: number;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
};

export function getTransactions(params: TransactionParams): Promise<TransactionListResponse> {
  const q = new URLSearchParams({
    account_id: String(params.accountId),
  });

  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.offset !== undefined) q.set("offset", String(params.offset));
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);

  return apiGet<TransactionListResponse>(`/api/transactions?${q.toString()}`);
}
