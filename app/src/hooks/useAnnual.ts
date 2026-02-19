import { useQuery } from "@tanstack/react-query";
import { getAnnualReport } from "../lib/api/annual";
import type { AnnualReport } from "../lib/api/annual";

export function useAnnualReport(year: number, accountId: number | "all" | null) {
  return useQuery<AnnualReport>({
    queryKey: ["reports", "annual", year, accountId],
    queryFn: () => getAnnualReport(year, accountId === null ? undefined : accountId),
    enabled: accountId !== null,
  });
}
