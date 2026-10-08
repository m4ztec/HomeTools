import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ApiError, authApi, getAccessToken, pantryApi } from "@/lib/api";
import { applySettings } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!getAccessToken()) throw redirect({ to: "/auth" });
    try {
      const user = await authApi.me();
      const settings = await pantryApi.settings();
      applySettings(settings);
      return { user, isAdmin: user.isAdmin };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw redirect({ to: "/auth" });
      }
      throw error;
    }
  },
  component: () => <Outlet />,
});
