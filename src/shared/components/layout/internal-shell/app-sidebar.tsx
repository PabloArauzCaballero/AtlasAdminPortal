"use client";

import Link from "next/link";
import { ChevronDown, LogOut, X } from "lucide-react";
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
        "atlas-press atlas-tap group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
        indent && "pl-9",
        active && "bg-white/[0.09] text-white",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-full bg-teal-300 transition-all duration-200",
          active && "h-5",
        )}
      />
      {/*
        UN icono, no dos.
        
        El merge de las dos ramas visuales dejo los dos renders encadenados —el de la rama que traia
        el hover y el de la que traia el color activo—, asi que CADA entrada del menu pintaba su
        icono duplicado. No se detecto porque los dos son el mismo glifo al mismo tamano: se lee como
        un icono ancho, no como un error. Se conserva el que tiene el movimiento y el color de marca.
      */}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
          active && "text-teal-300",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

interface AppSidebarProps {
  /** Sólo gobierna el móvil: por encima de `lg` la barra está siempre presente. */
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({
  open = false,
  onClose = () => {},
}: Readonly<AppSidebarProps>) {
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
    <>
      {/*
       * Velo. Separa el cajón del trabajo que hay detrás —sin él, la barra oscura sobre el lienzo
       * claro no deja claro cuál de las dos capas está activa— y da el gesto que todo el mundo
       * intenta primero: tocar fuera para cerrar.
       *
       * No se desmonta al cerrar, se atenúa: un elemento que sale del árbol no puede animar su
       * salida, y el corte seco delata que el menú es un `display:none` con estilos.
       */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/*
       * El mismo elemento es la barra fija del escritorio y el cajón del móvil. Antes existía sólo
       * por encima de 1024 px y NO había ninguna otra forma de navegar: el portal entero era
       * inalcanzable desde un teléfono salvo escribiendo la URL a mano.
       *
       * Va en columna flexible en vez de con la cabecera y el pie posicionados: con alturas fijas,
       * en una pantalla de 640 px el pie con el usuario se montaba encima de los últimos enlaces.
       */}
      <aside
        id="atlas-nav"
        data-open={open ? "true" : "false"}
        aria-label="Navegación principal"
        className={cn(
          "atlas-drawer atlas-safe-top fixed inset-y-0 left-0 z-40 flex w-[286px] max-w-[86vw] flex-col border-r border-slate-800 bg-atlas-mesh",
          "lg:z-30 lg:w-[268px] lg:max-w-none lg:translate-x-0 lg:shadow-none",
          open
            ? "translate-x-0 shadow-[0_24px_70px_-16px_rgba(2,6,23,0.65)]"
            : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-atlas-accent to-atlas-primary text-sm font-bold text-white shadow-glow">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-4 text-white">ATLAS</p>
            <p className="text-xs text-slate-300">Portal interno</p>
          </div>
          {/* El cierre explícito va sólo en móvil: en escritorio la barra no se cierra. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar navegación"
            className="atlas-press atlas-tap -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="atlas-scrollbar flex-1 space-y-1 overflow-auto px-3 py-4">
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
                  className="atlas-press atlas-tap flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-300 transition-colors hover:text-white"
                >
                  <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {group.label}
                  </span>
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
        <div className="shrink-0 border-t border-white/10 bg-black/20 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="mb-3 flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-atlas-accent to-atlas-primary text-xs font-semibold text-white">
              {(user?.fullName ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.fullName ?? "Usuario interno"}
              </p>
              <p className="truncate text-xs text-slate-300">{user?.email}</p>
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
    </>
  );
}
