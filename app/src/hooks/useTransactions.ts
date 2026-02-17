import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../lib/api";

export function useTransactions(params: {
  accountId: number | null;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  categoryFilter?: string;
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
    ],
    queryFn: () =>
      getTransactions({
        accountId: params.accountId!,
        limit: params.limit,
        offset: params.offset,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        categoryFilter: params.categoryFilter,
      }),
    enabled: params.accountId !== null,
  });
}
