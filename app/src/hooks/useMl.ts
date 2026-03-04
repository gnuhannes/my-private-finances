import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSuggestions, trainModel } from "../lib/api/ml";
import { updateTransactionCategory } from "../lib/api/transactions";

export function useSuggestions() {
  return useQuery({
    queryKey: ["ml", "suggestions"],
    queryFn: getSuggestions,
  });
}

export function useTrainModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trainModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml", "suggestions"] });
    },
  });
}

export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, categoryId }: { transactionId: number; categoryId: number }) =>
      updateTransactionCategory(transactionId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["ml", "suggestions"] });
    },
  });
}
