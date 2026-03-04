import { apiGet, apiPost } from "./client";

export type TrainResult = {
  num_samples: number;
  num_categories: number;
};

export type Suggestion = {
  transaction_id: number;
  category_id: number;
  category_name: string;
  confidence: number;
  payee: string | null;
  purpose: string | null;
  amount: string;
  booking_date: string;
};

export function trainModel(): Promise<TrainResult> {
  return apiPost<TrainResult>("/api/ml/train", {});
}

export function getSuggestions(): Promise<Suggestion[]> {
  return apiGet<Suggestion[]>("/api/ml/suggest");
}
