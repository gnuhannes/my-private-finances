import { useQuery } from "@tanstack/react-query";
import { getRules } from "../lib/api/categorization-rules";

export function useCategorizationRules() {
  return useQuery({
    queryKey: ["categorization-rules"],
    queryFn: getRules,
  });
}
