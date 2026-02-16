import { ApiError } from "./client";

export type ImportResult = {
  total_rows: number;
  created: number;
  duplicates: number;
  failed: number;
  errors: string[];
};

export type ImportCsvParams = {
  file: File;
  accountId: number;
  delimiter?: string;
  dateFormat?: string;
  decimalComma?: boolean;
};

export async function importCsv(params: ImportCsvParams): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", params.file);

  const query = new URLSearchParams({ account_id: String(params.accountId) });
  if (params.delimiter) query.set("delimiter", params.delimiter);
  if (params.dateFormat) query.set("date_format", params.dateFormat);
  if (params.decimalComma) query.set("decimal_comma", "true");

  const res = await fetch(`/api/imports/csv?${query}`, {
    method: "POST",
    body: formData,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, body);
  }

  return body as ImportResult;
}
