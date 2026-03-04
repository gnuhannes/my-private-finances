import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client";

export interface WatchSettings {
  root_path: string;
}

export interface WatchFolderConfig {
  id: number;
  subfolder_name: string;
  account_id: number;
  profile_id: number | null;
}

export interface WatchFolderConfigCreate {
  subfolder_name: string;
  account_id: number;
  profile_id?: number | null;
}

export interface WatchFolderConfigUpdate {
  account_id?: number;
  profile_id?: number | null;
}

export function getWatchSettings(): Promise<WatchSettings> {
  return apiGet<WatchSettings>("/api/watch-folder/settings");
}

export function updateWatchSettings(root_path: string): Promise<WatchSettings> {
  return apiPatch<WatchSettings>("/api/watch-folder/settings", { root_path });
}

export function getWatchConfigs(): Promise<WatchFolderConfig[]> {
  return apiGet<WatchFolderConfig[]>("/api/watch-folder/configs");
}

export function createWatchConfig(data: WatchFolderConfigCreate): Promise<WatchFolderConfig> {
  return apiPost<WatchFolderConfig>("/api/watch-folder/configs", data);
}

export function updateWatchConfig(
  id: number,
  data: WatchFolderConfigUpdate,
): Promise<WatchFolderConfig> {
  return apiPut<WatchFolderConfig>(`/api/watch-folder/configs/${id}`, data);
}

export function deleteWatchConfig(id: number): Promise<void> {
  return apiDelete(`/api/watch-folder/configs/${id}`);
}
