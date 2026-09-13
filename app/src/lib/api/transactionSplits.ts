import { apiDelete, apiGet, apiPut } from "./client";

export type TransactionSplitRead = {
  id: number;
  category_id: number | null;
  category_name: string | null;
  amount: string;
  note: string | null;
};

export type TransactionSplitItem = {
  category_id: number | null;
  amount: string;
  note?: string | null;
};

export function getTransactionSplits(transactionId: number): Promise<TransactionSplitRead[]> {
  return apiGet<TransactionSplitRead[]>(`/api/transactions/${transactionId}/splits`);
}

export function replaceTransactionSplits(
  transactionId: number,
  items: TransactionSplitItem[],
): Promise<TransactionSplitRead[]> {
  return apiPut<TransactionSplitRead[]>(`/api/transactions/${transactionId}/splits`, items);
}

export function deleteTransactionSplits(transactionId: number): Promise<void> {
  return apiDelete<void>(`/api/transactions/${transactionId}/splits`);
}
