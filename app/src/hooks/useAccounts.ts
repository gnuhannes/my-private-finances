import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../lib/api";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });
}
