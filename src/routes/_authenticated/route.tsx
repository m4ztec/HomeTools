import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { applySettings } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const [{ data: isAdmin }, { data: settings }] = await Promise.all([
      supabase.rpc("claim_super_admin"),
      supabase.from("app_settings").select("*").maybeSingle(),
    ]);
    if (settings) applySettings(settings);
    return { user: data.user, isAdmin: !!isAdmin };
  },
  component: () => <Outlet />,
});
