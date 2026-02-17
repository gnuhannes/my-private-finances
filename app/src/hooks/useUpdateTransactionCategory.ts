import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTransactionCategory } from "../lib/api/transactions";

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number | null }) =>
      updateTransactionCategory(id, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
