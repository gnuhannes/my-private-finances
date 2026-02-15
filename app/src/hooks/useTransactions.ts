import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../lib/api";

export function useTransactions(params: {
  accountId: number | null;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: [
      "transactions",
      params.accountId,
      params.limit,
      params.offset,
      params.dateFrom,
      params.dateTo,
    ],
    queryFn: () =>
      getTransactions({
        accountId: params.accountId!,
        limit: params.limit,
        offset: params.offset,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      }),
    enabled: params.accountId !== null,
  });
}
