import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCsvProfile,
  deleteCsvProfile,
  getCsvProfiles,
  updateCsvProfile,
} from "../lib/api/csvProfiles";
import type { CsvProfileCreate, CsvProfileUpdate } from "../lib/api/csvProfiles";

const QUERY_KEY = ["csv-profiles"];

export function useCsvProfiles() {
  const queryClient = useQueryClient();

  const profiles = useQuery({ queryKey: QUERY_KEY, queryFn: getCsvProfiles });

  const create = useMutation({
    mutationFn: (data: CsvProfileCreate) => createCsvProfile(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CsvProfileUpdate }) =>
      updateCsvProfile(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteCsvProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { profiles, create, update, remove };
}
