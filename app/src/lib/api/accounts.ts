import { apiGet, apiPatch } from "./client";

export type Account = {
  id: number;
  name: string;
  currency: string;
  opening_balance: string | null;
  opening_balance_date: string | null;
};

export function getAccounts(): Promise<Account[]> {
  return apiGet<Account[]>("/api/accounts");
}

export type AccountUpdatePayload = {
  opening_balance?: string;
  opening_balance_date?: string;
};

export function updateAccount(id: number, data: AccountUpdatePayload): Promise<Account> {
  return apiPatch<Account>(`/api/accounts/${id}`, data);
}
