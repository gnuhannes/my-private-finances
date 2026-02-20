import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNetWorth } from "../lib/api/netWorth";
import { createAccount, updateAccount, type AccountCreatePayload, type AccountUpdatePayload } from "../lib/api/accounts";

export function useNetWorth(months: number = 12) {
  return useQuery({
    queryKey: ["reports", "net-worth", months],
    queryFn: () => getNetWorth(months),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountCreatePayload) => createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountUpdatePayload }) =>
      updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "net-worth"] });
    },
  });
}
