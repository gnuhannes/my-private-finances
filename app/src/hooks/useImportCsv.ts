import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importCsv } from "../lib/api";

export function useImportCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importCsv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
