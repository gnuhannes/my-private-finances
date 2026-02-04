import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";

export type Account = {
    id: number;
    name: string;
    currency: string;
};

export function useAccounts() {
    return useQuery({
        queryKey: ["accounts"],
        queryFn: () => apiGet<Account[]>("/api/accounts"),
    });
}
