"use client";

import { Bell, Home, Menu, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMyUnreadNotificationsCount } from "@/features/my-notifications/hooks";
import { cn } from "@/shared/lib/cn";

type Destino = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Las tres pantallas que se abren desde cualquier parte, ninguna con permiso propio: son las
 * mismas que ya llevaban la hamburguesa («Inicio»), la lupa y la campana de la cabecera, así que
 * esta barra NO concede ni esconde nada que el menú lateral no hiciera ya. Todo lo demás
 * (sesenta pantallas) sigue en el cajón, que filtra por permiso.
 */
const DESTINOS: Destino[] = [
  { label: "Inicio", href: "/internal", icon: Home },
  { label: "Buscar", href: "/internal/search", icon: Search },
  { label: "Avisos", href: "/internal/my-notifications", icon: Bell },
];

function esActivo(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/internal" && pathname.startsWith(`${href}/`))
  );
}

/*
 * `h-14` y no `min-h-*`: `.atlas-tap` (globals.css) fija `min-height: 44px` sin capas de CSS y gana a
 * cualquier utilidad de Tailwind de igual especificidad, así que un `min-h` mayor se ignoraba y la
 * barra salía de 44 px.
 */
const ITEM =
  "atlas-press atlas-tap relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-atlas-accent/60";

/**
 * Navegación inferior del móvil (`<lg`).
 *
 * Existe porque el único camino era la hamburguesa arriba a la izquierda: en un teléfono alto
 * queda fuera del alcance del pulgar justo para lo más frecuente. «Más» abre el MISMO cajón de
 * siempre, no uno nuevo. Respeta la barra de gestos de iOS con `env(safe-area-inset-bottom)`, que
 * vale algo gracias a `viewport-fit=cover` en el `layout` raíz.
 *
 * El estado del cajón vive en `AppShell` (es el padre común de la barra y del cajón), así que aquí
 * sólo se recibe `onMore` y si está abierto.
 */
export function MobileBottomNav({
  onMore,
  moreOpen,
}: Readonly<{ onMore: () => void; moreOpen: boolean }>) {
  const pathname = usePathname();
  const unread = useMyUnreadNotificationsCount().data?.unread ?? 0;

  return (
    <nav
      aria-label="Accesos rápidos"
      className="atlas-glass fixed inset-x-0 bottom-0 z-20 border-t border-atlas-border pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      <ul className="flex items-stretch">
        {DESTINOS.map(({ label, href, icon: Icon }) => {
          const activo = esActivo(pathname, href);
          const esAvisos = href === "/internal/my-notifications";
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                aria-label={
                  esAvisos && unread > 0
                    ? `${label}: ${unread} sin leer`
                    : label
                }
                className={cn(
                  ITEM,
                  activo ? "text-atlas-accent" : "text-atlas-muted",
                )}
              >
                {/* La barrita superior marca el activo sin depender sólo del color. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-atlas-accent transition-opacity",
                    activo ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {esAvisos && unread > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-atlas-critical px-1 text-[10px] font-bold text-white"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={onMore}
            aria-label="Más: abre el menú con todas las secciones"
            aria-controls="atlas-nav"
            aria-expanded={moreOpen}
            className={cn(
              ITEM,
              moreOpen ? "text-atlas-accent" : "text-atlas-muted",
            )}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            Más
          </button>
        </li>
      </ul>
    </nav>
  );
}
