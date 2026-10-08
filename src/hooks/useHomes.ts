import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pantryApi, type Member } from "@/lib/api";
import type { Home, Item } from "@/lib/inventory";

export function useHomes() {
  return useQuery({
    queryKey: ["homes"],
    queryFn: pantryApi.homes,
  });
}

export function useItems(homeId: string | null) {
  return useQuery({
    queryKey: ["items", homeId],
    enabled: !!homeId,
    queryFn: () => pantryApi.items(homeId!),
  });
}

export function useAllItems(homeIds: string[]) {
  const key = [...homeIds].sort().join(",");
  return useQuery({
    queryKey: ["items", "all", key],
    enabled: homeIds.length > 0,
    queryFn: () => pantryApi.allItems(homeIds),
  });
}

export function useMembers(homeId: string | null) {
  return useQuery({
    queryKey: ["members", homeId],
    enabled: !!homeId,
    queryFn: () => pantryApi.members(homeId!),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

export function useCreateHome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: pantryApi.createHome,
    onSuccess: () => invalidate(["homes"]),
    onError: (error) => toast.error(error.message),
  });
}

export function useJoinHome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: pantryApi.joinHome,
    onSuccess: () => invalidate(["homes", "members"]),
    onError: (error) => toast.error(error.message),
  });
}

export function useLeaveHome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: pantryApi.leaveHome,
    onSuccess: () => invalidate(["homes", "members", "items"]),
    onError: (error) => toast.error(error.message),
  });
}

export type ItemInput = {
  name: string;
  category: string;
  price: number;
  unit: string;
  qty: number;
  target_qty: number;
  expires_at: string | null;
};

export function useAddItem(homeId: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ItemInput) => {
      if (!homeId) throw new Error("Pick a home first");
      return pantryApi.addItem(homeId, input);
    },
    onSuccess: () => invalidate(["items"]),
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<ItemInput> & { id: string }) =>
      pantryApi.updateItem(id, patch),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["items"] });
      const snapshots = qc.getQueriesData<Item[]>({ queryKey: ["items"] });
      qc.setQueriesData<Item[]>({ queryKey: ["items"] }, (old) =>
        old?.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(error.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: pantryApi.deleteItem,
    onSuccess: () => invalidate(["items"]),
    onError: (error) => toast.error(error.message),
  });
}
