import { useQuery } from "@tanstack/react-query";
import { getRecurringPatterns, getRecurringSummary } from "../lib/api/recurringPatterns";

export function useRecurringPatterns(accountId: number | null, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ["recurring-patterns", accountId, includeInactive],
    queryFn: () => getRecurringPatterns(accountId!, includeInactive),
    enabled: accountId !== null,
  });
}

export function useRecurringSummary(accountId: number | null) {
  return useQuery({
    queryKey: ["recurring-patterns", "summary", accountId],
    queryFn: () => getRecurringSummary(accountId!),
    enabled: accountId !== null,
  });
}
