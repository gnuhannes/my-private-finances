import { useQuery } from "@tanstack/react-query";
import { getBudgetVsActual } from "../lib/api/reports";

export function useBudgetVsActual(accountId: number | null, month: string) {
  return useQuery({
    queryKey: ["reports", "budget-vs-actual", accountId, month],
    queryFn: () => getBudgetVsActual({ accountId: accountId!, month }),
    enabled: accountId !== null,
  });
}
