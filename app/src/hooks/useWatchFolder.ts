import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWatchConfig,
  deleteWatchConfig,
  getWatchConfigs,
  getWatchSettings,
  updateWatchConfig,
  updateWatchSettings,
  type WatchFolderConfigCreate,
  type WatchFolderConfigUpdate,
} from "../lib/api/watchFolder";

const SETTINGS_KEY = ["watch-folder", "settings"] as const;
const CONFIGS_KEY = ["watch-folder", "configs"] as const;

export function useWatchSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: getWatchSettings });
}

export function useUpdateWatchSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (root_path: string) => updateWatchSettings(root_path),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useWatchConfigs() {
  return useQuery({ queryKey: CONFIGS_KEY, queryFn: getWatchConfigs });
}

export function useCreateWatchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WatchFolderConfigCreate) => createWatchConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}

export function useUpdateWatchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WatchFolderConfigUpdate }) =>
      updateWatchConfig(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}

export function useDeleteWatchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWatchConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}
