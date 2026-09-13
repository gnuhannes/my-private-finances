import { apiGet, apiPatch } from "./client";
import type { Schemas } from "./schema-helpers";

export type AppSettings = Schemas["AppSettingsRead"];
export type AppSettingsUpdatePayload = Schemas["AppSettingsUpdate"];

export function getAppSettings(): Promise<AppSettings> {
  return apiGet<AppSettings>("/api/settings/app");
}

export function updateAppSettings(data: AppSettingsUpdatePayload): Promise<AppSettings> {
  return apiPatch<AppSettings>("/api/settings/app", data);
}
