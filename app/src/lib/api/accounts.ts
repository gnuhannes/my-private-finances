import { apiGet } from "./client";

export type Account = {
    id: number;
    name: string;
    currency: string;
};

export function getAccounts(): Promise<Account[]> {
    return apiGet<Account[]>("/api/accounts");
}
