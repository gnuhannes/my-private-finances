import { apiDelete, apiGet, apiPost, apiPut } from "./client";

export type ColumnMap = Partial<
  Record<"booking_date" | "amount" | "currency" | "payee" | "purpose" | "external_id", string[]>
>;

export type CsvProfile = {
  id: number;
  name: string;
  delimiter: string;
  date_format: string;
  decimal_comma: boolean;
  column_map: ColumnMap;
};

export type CsvProfileCreate = Omit<CsvProfile, "id">;
export type CsvProfileUpdate = Partial<CsvProfileCreate>;

export function getCsvProfiles(): Promise<CsvProfile[]> {
  return apiGet<CsvProfile[]>("/api/csv-profiles");
}

export function createCsvProfile(data: CsvProfileCreate): Promise<CsvProfile> {
  return apiPost<CsvProfile>("/api/csv-profiles", data);
}

export function updateCsvProfile(id: number, data: CsvProfileUpdate): Promise<CsvProfile> {
  return apiPut<CsvProfile>(`/api/csv-profiles/${id}`, data);
}

export function deleteCsvProfile(id: number): Promise<void> {
  return apiDelete(`/api/csv-profiles/${id}`);
}
