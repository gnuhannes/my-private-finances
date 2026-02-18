import { useQuery } from "@tanstack/react-query";
import { getFixedVsVariable } from "../lib/api/reports";

/** accountId: number for per-account, "all" for aggregated, null while loading */
export function useFixedVsVariable(accountId: number | "all" | null, month: string) {
  return useQuery({
    queryKey: ["reports", "fixed-vs-variable", accountId, month],
    queryFn: () => getFixedVsVariable({ accountId: accountId!, month }),
    enabled: accountId !== null,
  });
}
