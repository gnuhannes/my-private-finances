import { useQuery } from "@tanstack/react-query";
import { getBudgets } from "../lib/api/budgets";

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: getBudgets,
  });
}
