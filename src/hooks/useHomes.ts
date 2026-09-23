import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Home, Item } from "@/lib/inventory";

export function useHomes() {
  return useQuery({
    queryKey: ["homes"],
    queryFn: async (): Promise<Home[]> => {
      const { data, error } = await supabase.from("homes").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useItems(homeId: string | null) {
  return useQuery({
    queryKey: ["items", homeId],
    enabled: !!homeId,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase.from("items").select("*").eq("home_id", homeId!).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export type Member = { user_id: string; role: string; display_name: string };

export function useMembers(homeId: string | null) {
  return useQuery({
    queryKey: ["members", homeId],
    enabled: !!homeId,
    queryFn: async (): Promise<Member[]> => {
      const { data: members, error } = await supabase.from("home_members").select("user_id, role").eq("home_id", homeId!).order("joined_at");
      if (error) throw error;
      const ids = members.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const names = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);
      return members.map((m) => ({ ...m, display_name: names.get(m.user_id) || "Member" }));
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreateHome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("homes").insert({ name, created_by: userData.user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(["homes"]),
    onError: (e) => toast.error(e.message),
  });
}

export function useJoinHome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("join_home_by_code", { _code: code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(["homes", "members"]),
    onError: (e) => toast.error(e.message.includes("Invalid") ? "That invite code doesn't match any home." : e.message),
  });
}

export function useLeaveHome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (homeId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("home_members").delete().eq("home_id", homeId).eq("user_id", userData.user!.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["homes", "members", "items"]),
    onError: (e) => toast.error(e.message),
  });
}

export type ItemInput = {
  name: string;
  category: string;
  price: number;
  quantity: number;
  target_quantity: number;
  expires_at: string | null;
};

export function useAddItem(homeId: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: ItemInput) => {
      if (!homeId) throw new Error("Pick a home first");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("items").insert({ ...input, home_id: homeId, created_by: userData.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => invalidate(["items"]),
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ItemInput> & { id: string }) => {
      const { error } = await supabase.from("items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["items"] });
      const snapshots = qc.getQueriesData<Item[]>({ queryKey: ["items"] });
      qc.setQueriesData<Item[]>({ queryKey: ["items"] }, (old) => old?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      return { snapshots };
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["items"]),
    onError: (e) => toast.error(e.message),
  });
}
