"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/auth/auth-context";
import { cn } from "@/shared/lib/cn";
import { tabbedItemFor, visibleTabs } from "./nav-access";

/**
 * La fila de pestañas de una entrada fusionada del menú («Cola de trabajo», «Comercios»…).
 *
 * Son ENLACES y no botones de pestaña: cada una es una pantalla con su ruta, su permiso y su
 * propio estado, y así un enlace guardado sigue abriendo lo mismo de siempre. Va encima de la
 * cabecera de la pantalla para que se lea como «dónde estoy dentro de la sección» y no compita
 * con las pestañas que algunas pantallas ya tienen dentro.
 *
 * Con una sola pestaña a la vista no se pinta: una fila de una opción no elige nada.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const { hasAnyPermission, hasAnyRole } = useAuth();
  const item = tabbedItemFor(pathname);
  if (!item) return null;
  const tabs = visibleTabs(item, { hasAnyPermission, hasAnyRole });
  if (tabs.length < 2) return null;
  const ruta = pathname.replace(/\/+$/, "");

  return (
    <nav
      aria-label={item.label}
      className="mb-4 flex flex-wrap gap-1 border-b border-atlas-border"
    >
      {tabs.map((tab) => {
        const selected = tab.href === ruta;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-10 items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50",
              selected
                ? "border-atlas-accent text-atlas-text"
                : "border-transparent text-atlas-muted hover:text-atlas-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
