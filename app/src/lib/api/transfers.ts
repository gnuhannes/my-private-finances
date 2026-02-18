import { apiGet, apiPost } from "./client";

export type TransferLeg = {
  transaction_id: number;
  account_id: number;
  account_name: string;
  booking_date: string;
  amount: string;
  payee: string | null;
};

export type TransferCandidate = {
  id: number;
  from_leg: TransferLeg;
  to_leg: TransferLeg;
  confidence: string;
  status: "pending" | "confirmed" | "dismissed";
};

export function detectTransfers(): Promise<TransferCandidate[]> {
  return apiPost<TransferCandidate[]>("/api/transfers/detect", {});
}

export function getTransferCandidates(
  status: "pending" | "confirmed" | "dismissed" = "pending",
): Promise<TransferCandidate[]> {
  return apiGet<TransferCandidate[]>(`/api/transfers/candidates?status=${status}`);
}

export function confirmTransfer(id: number): Promise<TransferCandidate> {
  return apiPost<TransferCandidate>(`/api/transfers/candidates/${id}/confirm`, {});
}

export function dismissTransfer(id: number): Promise<TransferCandidate> {
  return apiPost<TransferCandidate>(`/api/transfers/candidates/${id}/dismiss`, {});
}
