import { useQuery } from "@tanstack/react-query";
import { getFixedVsVariable } from "../lib/api/reports";

export function useFixedVsVariable(accountId: number | null, month: string) {
  return useQuery({
    queryKey: ["reports", "fixed-vs-variable", accountId, month],
    queryFn: () => getFixedVsVariable({ accountId: accountId!, month }),
    enabled: accountId !== null,
  });
}
