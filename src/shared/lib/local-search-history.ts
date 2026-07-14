"use client";

const STORAGE_KEY = "atlas.recentSearches";
const MAX_ENTRIES = 8;

/**
 * The only file allowed to touch localStorage directly (see
 * scripts/check-source-boundaries.mjs) — every other module must go through
 * this wrapper so browser-storage usage stays auditable in one place.
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
