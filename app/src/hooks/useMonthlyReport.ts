import { useQuery } from "@tanstack/react-query";
import { getMonthlyReport } from "../lib/api/reports";

/** accountId: number for per-account, "all" for aggregated, null while loading */
export function useMonthlyReport(accountId: number | "all" | null, month: string) {
  return useQuery({
    queryKey: ["reports", "monthly", accountId, month],
    queryFn: () => getMonthlyReport({ accountId: accountId!, month }),
    enabled: accountId !== null,
  });
}
