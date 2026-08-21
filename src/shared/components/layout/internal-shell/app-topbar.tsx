"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearchBox } from "./global-search-box";
import { LiveDot } from "@/shared/components/ui/badges";
import { NotificationBell } from "@/features/my-notifications/notification-bell";
import {
  getRuntimeEnvironmentLabel,
  getServiceOriginLabel,
} from "@/shared/lib/runtime-environment";

export function AppTopbar({
  onMenu,
  menuOpen,
}: Readonly<{ onMenu: () => void; menuOpen: boolean }>) {
  return (
    <header className="atlas-glass atlas-safe-top sticky top-0 z-20 border-b border-atlas-border shadow-sm">
      <div className="flex h-16 items-center justify-between gap-2 px-3 sm:gap-4 lg:px-6">
        {/*
         * La hamburguesa es la corrección de fondo de esta barra: por debajo de 1024 px la barra
         * lateral estaba oculta y no había ninguna otra forma de navegar el portal.
         */}
        <button
          type="button"
          onClick={onMenu}
          aria-label="Abrir navegación"
          aria-controls="atlas-nav"
          aria-expanded={menuOpen}
          className="atlas-press atlas-tap -ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-atlas-text hover:bg-atlas-soft lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
          {/* El origen del servicio se retira en pantallas estrechas: es la mitad menos urgente de
              la línea —el ambiente es lo que evita operar contra producción por error— y entera
              empujaba las migas de pan a dos líneas en 360 px. */}
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-atlas-muted">
            <LiveDot tone="success" />
            <span className="truncate">
              Ambiente: {getRuntimeEnvironmentLabel()}
              <span className="hidden sm:inline">
                {" "}
                · {getServiceOriginLabel()}
              </span>
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-3">
          <div className="hidden w-full max-w-sm items-center gap-2 md:flex">
            <GlobalSearchBox />
          </div>
          {/* La caja de búsqueda no cabe en móvil, pero la búsqueda sí tiene que estar: el icono
              lleva a la misma pantalla en vez de dejar el hueco. */}
          <Link
            href="/internal/search"
            aria-label="Buscar"
            className="atlas-press atlas-tap flex h-10 w-10 items-center justify-center rounded-full text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text md:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
