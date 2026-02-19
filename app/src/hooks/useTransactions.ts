import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../lib/api";

export function useTransactions(params: {
  accountId: number | "all" | null;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  categoryFilter?: string;
  q?: string;
  amountMin?: string;
  amountMax?: string;
}) {
  return useQuery({
    queryKey: [
      "transactions",
      params.accountId,
      params.limit,
      params.offset,
      params.dateFrom,
      params.dateTo,
      params.categoryFilter,
      params.q,
      params.amountMin,
      params.amountMax,
    ],
    queryFn: () =>
      getTransactions({
        accountId: params.accountId!,
        limit: params.limit,
        offset: params.offset,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        categoryFilter: params.categoryFilter,
        q: params.q,
        amountMin: params.amountMin,
        amountMax: params.amountMax,
      }),
    enabled: params.accountId !== null,
  });
}
