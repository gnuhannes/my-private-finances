import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmTransfer,
  detectTransfers,
  dismissTransfer,
  getTransferCandidates,
  linkManualTransfer,
  unlinkTransfer,
  type TransferStatus,
} from "../lib/api/transfers";

const QUERY_KEY = ["transfers", "candidates"];

export function useTransferCandidates(status: TransferStatus = "pending") {
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

export function useLinkManualTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkManualTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // A manual link is confirmed immediately — affects report data too.
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      // The linked transactions' is_transfer flag flipped.
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUnlinkTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unlinkTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
