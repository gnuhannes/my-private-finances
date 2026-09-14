import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAppSettings,
  updateAppSettings,
  type AppSettingsUpdatePayload,
} from "../lib/api/appSettings";

const APP_SETTINGS_KEY = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery({ queryKey: APP_SETTINGS_KEY, queryFn: getAppSettings });
}

export function useUpdateAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AppSettingsUpdatePayload) => updateAppSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY }),
  });
}
