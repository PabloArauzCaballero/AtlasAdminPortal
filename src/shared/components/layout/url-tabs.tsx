"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";

export type UrlTab = { value: string; label: string };

/**
 * La pestaña activa, leída de la URL (`?vista=`, `?tab=`). Un valor desconocido o ausente cae en la
 * primera pestaña permitida: un enlace viejo nunca deja la pantalla en blanco.
 */
export function useUrlTab(param: string, tabs: readonly UrlTab[]): string {
  const searchParams = useSearchParams();
  const requested = searchParams.get(param);
  return tabs.some((tab) => tab.value === requested)
    ? (requested as string)
    : (tabs[0]?.value ?? "");
}

/**
 * Pestañas cuyo estado vive en la URL: se pueden enlazar, marcar y volver atrás con el navegador.
 * Al cambiar de pestaña se conserva el resto de parámetros salvo `page`, que es de la pestaña que se
 * deja. Teclado: flechas izquierda/derecha, Inicio y Fin (patrón WAI-ARIA de pestañas).
 */
export function UrlTabs({
  param,
  tabs,
  label,
}: Readonly<{ param: string; tabs: readonly UrlTab[]; label: string }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useUrlTab(param, tabs);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, value);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
    select(tabs[next].value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-4 flex flex-wrap gap-1 border-b border-atlas-border"
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${param}-${tab.value}`}
            aria-selected={selected}
            aria-controls={`panel-${param}-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "-mb-px min-h-10 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50",
              selected
                ? "border-atlas-accent text-atlas-text"
                : "border-transparent text-atlas-muted hover:text-atlas-text",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Contenedor accesible del contenido de la pestaña activa. */
export function UrlTabPanel({
  param,
  value,
  children,
}: Readonly<{ param: string; value: string; children: React.ReactNode }>) {
  return (
    <div
      role="tabpanel"
      id={`panel-${param}-${value}`}
      aria-labelledby={`tab-${param}-${value}`}
    >
      {children}
    </div>
  );
}
