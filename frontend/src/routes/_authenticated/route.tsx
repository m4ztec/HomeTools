import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ApiError, getAccessToken } from "@/shared/lib/api-client";
import { authApi } from "@/features/auth/api";
import { pantryApi } from "@/features/pantry/api";
import { applySettings } from "@/features/pantry/model";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const invitationReturnTo =
      typeof window !== "undefined" &&
      window.location.pathname === "/join" &&
      window.location.hash.startsWith("#invite=")
        ? `${window.location.pathname}${window.location.hash}`
        : null;
    if (!getAccessToken()) throw authRedirect(invitationReturnTo);
    try {
      const user = await authApi.me();
      const settings = await pantryApi.settings();
      applySettings(settings);
      return { user, isAdmin: user.isAdmin };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw authRedirect(invitationReturnTo);
      }
      throw error;
    }
  },
  component: () => <Outlet />,
});

function authRedirect(returnTo: string | null) {
  return returnTo
    ? redirect({ to: "/auth", search: { mode: "signin", returnTo } })
    : redirect({ to: "/auth" });
}
