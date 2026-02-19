import { useQuery } from "@tanstack/react-query";
import { getSpendingTrend } from "../lib/api/trends";
import type { SpendingTrendReport } from "../lib/api/trends";

export function useSpendingTrend(
  lookbackMonths: number,
  accountId: number | "all" | null,
  month: string,
) {
  return useQuery<SpendingTrendReport>({
    queryKey: ["reports", "spending-trend", lookbackMonths, accountId, month],
    queryFn: () =>
      getSpendingTrend(lookbackMonths, accountId === null ? undefined : accountId, month),
    enabled: accountId !== null,
  });
}
