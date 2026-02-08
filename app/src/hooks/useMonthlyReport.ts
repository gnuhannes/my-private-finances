import {useQuery} from "@tanstack/react-query";
import {getMonthlyReport} from "../lib/api";

export function useMonthlyReport(accountId: number | null, month: string) {
    return useQuery({
        queryKey: ["reports", "monthly", accountId, month],
        queryFn: () => getMonthlyReport({accountId: accountId!, month}),
        enabled: accountId !== null,
    });
}
