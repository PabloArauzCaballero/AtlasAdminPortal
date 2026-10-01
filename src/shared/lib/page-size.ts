"use client";

import { useSyncExternalStore } from "react";

/**
 * Cuántas filas por página quiere ver la persona, igual para todas las tablas del portal.
 *
 * Es una preferencia de la persona y no de cada pantalla: quien pide 50 filas en una tabla las pide
 * en todas. Cada pantalla conserva su tamaño por defecto (`usePageSize(20)`) hasta que la persona
 * elige otro; el tope es 50 porque hay rutas del backend que no admiten más.
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;

const STORAGE_KEY = "atlas.portal.pageSize";
const listeners = new Set<() => void>();
let chosen: number | null = null;
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = Number(window.localStorage.getItem(STORAGE_KEY));
    if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(raw)) chosen = raw;
  } catch {
    // Sin almacenamiento (ventana privada, bloqueado): la elección vive sólo en esta pestaña.
  }
}

export function setPageSize(size: number) {
  load();
  chosen = size;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // Ver `load`: la tabla sigue funcionando sin recordar la elección.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): number | null {
  load();
  return chosen;
}

/** El tamaño de página vigente: el elegido por la persona o, si no eligió, el de la pantalla. */
export function usePageSize(fallback: number): number {
  const elegido = useSyncExternalStore(subscribe, snapshot, () => null);
  return elegido ?? fallback;
}
