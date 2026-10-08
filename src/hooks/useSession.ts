import { useEffect, useState } from "react";
import { ApiError, authApi, getAccessToken, onAuthChanged, type AuthUser } from "@/lib/api";

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const refresh = async () => {
      const currentRequestId = ++requestId;
      const token = getAccessToken();
      if (!token) {
        if (active && currentRequestId === requestId) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const currentUser = await authApi.me();
        if (active && currentRequestId === requestId) setUser(currentUser);
      } catch (error) {
        if (active && currentRequestId === requestId) setUser(null);
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem("pantry:access-token");
        } else {
          console.error("Could not load the current user.", error);
        }
      } finally {
        if (active && currentRequestId === requestId) setLoading(false);
      }
    };
    void refresh();
    const unsubscribe = onAuthChanged(() => {
      setLoading(true);
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}
