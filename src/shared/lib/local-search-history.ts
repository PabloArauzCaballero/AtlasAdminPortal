"use client";

const STORAGE_KEY = "atlas.recentSearches";
const MAX_ENTRIES = 8;

/**
 * Historial de búsquedas recientes en `localStorage`.
 *
 * No es el único archivo que toca el almacenamiento del navegador: la lista cerrada de los que
 * pueden hacerlo vive en `scripts/check-source-boundaries.mjs` (hoy, además de éste, la sesión,
 * las filas por página y el progreso de los tutoriales). Cualquier otro módulo que lo necesite
 * pasa por uno de ellos o se añade a esa lista con su motivo, para que el uso siga auditable.
 */
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (typeof window === "undefined" || !trimmed) return getRecentSearches();
  const current = getRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...current].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable (private browsing, quota) — recents are a nice-to-have, fail silently.
  }
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
