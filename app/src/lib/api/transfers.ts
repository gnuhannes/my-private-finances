import { apiGet, apiPost } from "./client";

export type TransferLeg = {
  transaction_id: number;
  account_id: number;
  account_name: string;
  booking_date: string;
  amount: string;
  payee: string | null;
};

export type TransferStatus = "pending" | "confirmed" | "dismissed" | "unlinked";

export type TransferCandidate = {
  id: number;
  from_leg: TransferLeg;
  to_leg: TransferLeg;
  confidence: string;
  status: TransferStatus;
  source: "auto" | "manual";
};

export function detectTransfers(): Promise<TransferCandidate[]> {
  return apiPost<TransferCandidate[]>("/api/transfers/detect", {});
}

export function getTransferCandidates(
  status: TransferStatus = "pending",
): Promise<TransferCandidate[]> {
  return apiGet<TransferCandidate[]>(`/api/transfers/candidates?status=${status}`);
}

export function confirmTransfer(id: number): Promise<TransferCandidate> {
  return apiPost<TransferCandidate>(`/api/transfers/candidates/${id}/confirm`, {});
}

export function dismissTransfer(id: number): Promise<TransferCandidate> {
  return apiPost<TransferCandidate>(`/api/transfers/candidates/${id}/dismiss`, {});
}

export function linkManualTransfer(params: {
  fromTransactionId: number;
  toTransactionId: number;
}): Promise<TransferCandidate> {
  return apiPost<TransferCandidate>("/api/transfers/manual", {
    from_transaction_id: params.fromTransactionId,
    to_transaction_id: params.toTransactionId,
  });
}

export function unlinkTransfer(id: number): Promise<TransferCandidate> {
  return apiPost<TransferCandidate>(`/api/transfers/candidates/${id}/unlink`, {});
}
