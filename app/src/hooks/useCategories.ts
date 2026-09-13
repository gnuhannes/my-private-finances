import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategoriesBatch, getCategories } from "../lib/api/categories";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
}

export function useCreateCategoriesBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategoriesBatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}
