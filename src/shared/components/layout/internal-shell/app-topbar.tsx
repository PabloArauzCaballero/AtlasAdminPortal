"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearchBox } from "./global-search-box";
import { LiveDot } from "@/shared/components/ui/badges";
import { NotificationBell } from "@/features/my-notifications/notification-bell";
import {
  getRuntimeEnvironmentLabel,
  getServiceOriginLabel,
} from "@/shared/lib/runtime-environment";
import { Tooltip } from "@/shared/components/ui/tooltip";
import { useAuth } from "@/shared/auth/auth-context";
import { UserMenu } from "./user-menu";

/** Los mismos permisos que pide la pantalla «Aprender»: sin ellos, el birrete llevaría a un «sin acceso». */
const TUTORIALES_PERMISOS = ["systems.endpoints.read", "systems.qa.read"];

export function AppTopbar() {
  const { hasAnyPermission } = useAuth();
  return (
    <header className="atlas-glass atlas-safe-top sticky top-0 z-20 border-b border-atlas-border shadow-sm">
      <div className="flex h-16 items-center justify-between gap-2 px-3 sm:gap-4 lg:px-6">
        {/*
         * Sin hamburguesa: por debajo de 1024 px la barra inferior (`MobileBottomNav`) lleva «Más»,
         * que abre el MISMO cajón. Dos controles para lo mismo gastaban un hueco de 40 px que el
         * título y el ambiente necesitaban (en 375 px se truncaban a «Ambient…»).
         */}
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
          {/* La lupa de móvil se fue a la barra inferior («Buscar»): lleva a la misma pantalla. */}
          {hasAnyPermission(TUTORIALES_PERMISOS) ? (
            <Tooltip text="Tutoriales: recorridos guiados sobre las pantallas reales y la guía de referencia.">
              <Link
                href="/internal/qa/aprender"
                aria-label="Tutoriales"
                className="atlas-press atlas-tap hidden h-10 w-10 md:flex items-center justify-center rounded-full text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text"
              >
                <GraduationCap className="h-5 w-5" />
              </Link>
            </Tooltip>
          ) : null}
          {/* En móvil las notificaciones son «Avisos» de la barra inferior, con su contador. */}
          <div className="hidden md:block">
            <NotificationBell />
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
