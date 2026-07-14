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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
        indent && "pl-9",
        active && "bg-white/10 text-white",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400 transition-all duration-200",
          active && "h-5",
        )}
      />
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
          active && "text-indigo-400",
        )}
      />
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] border-r border-slate-800 bg-atlas-mesh lg:block">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-glow">
          A
        </div>
        <div>
          <p className="text-sm font-semibold leading-4 text-white">ATLAS</p>
          <p className="text-xs text-slate-400">Portal interno</p>
        </div>
      </div>
      <nav className="atlas-scrollbar max-h-[calc(100vh-160px)] space-y-1 overflow-auto px-3 py-4">
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
                onClick={() =>
                  setOpenGroups((prev) => ({
                    ...prev,
                    [group.label]: !open,
                  }))
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-300"
              >
                <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid overflow-hidden transition-all duration-200 ease-in-out",
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
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-semibold text-white">
            {(user?.fullName ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user?.fullName ?? "Usuario interno"}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <Button
          className="w-full justify-start border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
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
