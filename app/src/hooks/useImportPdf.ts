import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importPdf } from "../lib/api/imports";

export function useImportPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importPdf,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
