"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const TABS = [
  "Prueba unitaria",
  "Journey (encadenado)",
  "Árbol de decisión",
];
export const UNIT_TABS = ["Funcional", "Carga"];

/**
 * Las pestañas del Lab viven en la URL (`?tab=journey&sub=carga`), no en un
 * useState: así se pueden enlazar, sobreviven a un F5 y —lo que lo motivó— el
 * tutorial puede abrir la pestaña que explica en vez de esperar a que el
 * usuario adivine. Un valor desconocido cae a la primera pestaña.
 */
export const TAB_BY_SLUG: Record<string, string> = {
  unitaria: TABS[0],
  journey: TABS[1],
  arbol: TABS[2],
};
export const SUB_BY_SLUG: Record<string, string> = {
  funcional: UNIT_TABS[0],
  carga: UNIT_TABS[1],
};

export function slugOf(map: Record<string, string>, label: string): string {
  return Object.keys(map).find((key) => map[key] === label) ?? "";
}

export function useUrlTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeTab = TAB_BY_SLUG[params.get("tab") ?? ""] ?? TABS[0];
  const unitTab = SUB_BY_SLUG[params.get("sub") ?? ""] ?? UNIT_TABS[0];
  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  return {
    activeTab,
    unitTab,
    setActiveTab: (label: string) =>
      setParam("tab", slugOf(TAB_BY_SLUG, label)),
    setUnitTab: (label: string) => setParam("sub", slugOf(SUB_BY_SLUG, label)),
  };
}
