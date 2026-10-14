import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, Shield, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AuthUser } from "@/features/auth/api";
import { ProfileDialog } from "@/features/auth/ProfileDialog";
import { setAccessToken } from "@/shared/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type AppNavbarProps = {
  user: AuthUser;
  isAdmin: boolean;
  active?: "services" | "pantry" | "irs" | "trades" | "admin";
  actions?: ReactNode;
};

export function AppNavbar({ user, isAdmin, active, actions }: AppNavbarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProfile, setShowProfile] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    setAccessToken(null);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-glass-line pb-4">
        <Link
          to="/homes"
          className="group flex items-center gap-3"
          aria-label="HomeTools dashboard"
        >
          <div className="glass grid size-10 place-items-center rounded-xl font-display text-lg font-semibold text-glow transition-colors group-hover:ring-1 group-hover:ring-glow/40">
            H
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-none">HomeTools</p>
            <p className="mt-1 text-xs text-mist">Practical tools for home</p>
          </div>
        </Link>

        <nav
          aria-label="Main navigation"
          className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto"
        >
          <Link
            to="/homes"
            hash="services"
            aria-current={active === "services" ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-foreground ${active === "services" ? "bg-white/5 text-foreground" : "text-mist"}`}
          >
            Services
          </Link>
          <Link
            to="/homes"
            hash="pantry"
            aria-current={active === "pantry" ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-foreground ${active === "pantry" ? "bg-white/5 text-foreground" : "text-mist"}`}
          >
            Pantry
          </Link>
          <Link
            to="/irs"
            aria-current={active === "irs" ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-foreground ${active === "irs" ? "bg-white/5 text-foreground" : "text-mist"}`}
          >
            IRS simulator
          </Link>
          <Link
            to="/trade-tracker"
            aria-current={active === "trades" ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-foreground ${active === "trades" ? "bg-white/5 text-foreground" : "text-mist"}`}
          >
            Trade tracker
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {actions}
          {isAdmin && (
            <Link
              to="/admin"
              aria-current={active === "admin" ? "page" : undefined}
              className="inline-flex size-9 items-center justify-center rounded-full glass text-mist transition-colors hover:bg-accent hover:text-foreground sm:w-auto sm:gap-2 sm:px-3"
            >
              <Shield className="size-4" />
              <span className="hidden text-sm sm:inline">Admin</span>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full glass px-2.5 text-sm text-mist transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:px-3"
                aria-label="Open account menu"
              >
                <UserRound className="size-4" />
                <span className="hidden max-w-28 truncate sm:inline">
                  {user.displayName || user.email}
                </span>
                <ChevronDown className="hidden size-3.5 sm:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass w-56 rounded-xl border-foreground/10 p-1.5"
            >
              <DropdownMenuLabel className="truncate px-2 py-2 text-xs font-normal text-mist">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-foreground/10" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg py-2"
                onSelect={() => setShowProfile(true)}
              >
                <UserRound className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-lg py-2 text-rose focus:text-rose"
                onSelect={() => void signOut()}
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {showProfile && (
        <ProfileDialog
          displayName={user.displayName}
          email={user.email}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}
