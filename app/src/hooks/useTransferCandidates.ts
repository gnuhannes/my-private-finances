import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmTransfer,
  detectTransfers,
  dismissTransfer,
  getTransferCandidates,
} from "../lib/api/transfers";

const QUERY_KEY = ["transfers", "candidates"];

export function useTransferCandidates(status: "pending" | "confirmed" | "dismissed" = "pending") {
  return useQuery({
    queryKey: [...QUERY_KEY, status],
    queryFn: () => getTransferCandidates(status),
  });
}

export function useDetectTransfers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: detectTransfers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useConfirmTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => confirmTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // Transfers affect report data — invalidate all reports
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDismissTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dismissTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
