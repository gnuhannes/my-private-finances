import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteTransactionSplits,
  getTransactionSplits,
  replaceTransactionSplits,
  type TransactionSplitItem,
} from "../lib/api/transactionSplits";

const QUERY_KEY = (transactionId: number) => ["transactionSplits", transactionId];

export function useTransactionSplits(transactionId: number, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEY(transactionId),
    queryFn: () => getTransactionSplits(transactionId),
    enabled,
  });
}

export function useReplaceTransactionSplits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      items,
    }: {
      transactionId: number;
      items: TransactionSplitItem[];
    }) => replaceTransactionSplits(transactionId, items),
    onSuccess: (_data, { transactionId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(transactionId) });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDeleteTransactionSplits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: number) => deleteTransactionSplits(transactionId),
    onSuccess: (_data, transactionId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(transactionId) });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
