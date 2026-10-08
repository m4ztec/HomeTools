import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ApiError, getAccessToken } from "@/shared/lib/api-client";
import { authApi } from "@/features/auth/api";
import { pantryApi } from "@/features/pantry/api";
import { applySettings } from "@/features/pantry/model";

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
