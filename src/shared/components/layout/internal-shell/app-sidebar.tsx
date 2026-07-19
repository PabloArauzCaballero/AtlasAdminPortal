"use client";

import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { navGroups, navItems, type InternalNavItem } from "./nav-config";

function isActivePath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/internal" && pathname.startsWith(`${href}/`))
  );
}

function NavLink({
  item,
  active,
  indent = false,
}: Readonly<{ item: InternalNavItem; active: boolean; indent?: boolean }>) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[0.8125rem] font-medium text-slate-400 transition-colors duration-150 hover:bg-white/[0.055] hover:text-slate-100",
        indent && "pl-9",
        active && "bg-white/[0.09] text-white",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-full bg-[#8296EA] transition-[height] duration-150",
          active && "h-4",
        )}
      />
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#9AABEF]")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, hasAnyPermission, hasAnyRole, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              hasAnyPermission(item.permissions) &&
              hasAnyRole(item.roles ?? []),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [hasAnyPermission, hasAnyRole],
  );

  const isGroupOpen = (label: string, items: InternalNavItem[]) => {
    if (label in openGroups) return openGroups[label];
    return items.some((item) => isActivePath(pathname, item.href));
  };

  const visibleItems = navItems.filter(
    (item) =>
      hasAnyPermission(item.permissions) && hasAnyRole(item.roles ?? []),
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] border-r border-white/[0.06] bg-atlas-mesh lg:block">
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.07] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.08] text-xs font-semibold text-white">
          A
        </div>
        <div>
          <p className="text-[0.8125rem] font-semibold leading-4 tracking-[0.06em] text-white">
            ATLAS
          </p>
          <p className="text-[0.6875rem] text-slate-500">Portal interno</p>
        </div>
      </div>
      <nav className="atlas-scrollbar max-h-[calc(100vh-150px)] space-y-1 overflow-auto px-2.5 py-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
          />
        ))}

        {groups.map((group) => {
          const GroupIcon = group.icon;
          const open = isGroupOpen(group.label, group.items);
          return (
            <div key={group.label} className="pt-1">
              <button
                type="button"
                // El plegado es puramente visual (grid-rows-[0fr]), así que sin
                // esto no queda ninguna pista accesible del estado del cajón.
                aria-expanded={open}
                onClick={() =>
                  setOpenGroups((prev) => ({
                    ...prev,
                    [group.label]: !open,
                  }))
                }
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-600 transition-colors duration-150 hover:text-slate-400"
              >
                <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-150",
                    open && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid overflow-hidden transition-[grid-template-rows,opacity] duration-[180ms] ease-out",
                  open
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActivePath(pathname, item.href)}
                      indent
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.07] bg-black/10 p-3">
        <div className="mb-2.5 flex min-w-0 items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#405CCB] text-[0.6875rem] font-semibold text-white">
            {(user?.fullName ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">
              {user?.fullName ?? "Usuario interno"}
            </p>
            <p className="truncate text-[0.6875rem] text-slate-500">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          className="h-8 w-full justify-start border-white/[0.06] bg-white/[0.04] text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white"
          variant="ghost"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
