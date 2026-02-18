import { useQuery } from "@tanstack/react-query";
import { getBudgetVsActual } from "../lib/api/reports";

/** accountId: number for per-account, "all" for aggregated, null while loading */
export function useBudgetVsActual(accountId: number | "all" | null, month: string) {
  return useQuery({
    queryKey: ["reports", "budget-vs-actual", accountId, month],
    queryFn: () => getBudgetVsActual({ accountId: accountId!, month }),
    enabled: accountId !== null,
  });
}
