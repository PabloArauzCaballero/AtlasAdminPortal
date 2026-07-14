"use client";

import { Clock, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useGlobalSearch } from "@/features/search/hooks";
import { Input } from "@/shared/components/ui/input";
import {
  addRecentSearch,
  getRecentSearches,
} from "@/shared/lib/local-search-history";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

export function GlobalSearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebouncedValue(q, 350);
  const suggestions = useGlobalSearch(open ? debouncedQ.trim() : "");

  useEffect(() => setRecents(getRecentSearches()), [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function go(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecents(addRecentSearch(trimmed));
    setOpen(false);
    router.push(`/internal/search?q=${encodeURIComponent(trimmed)}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(q);
  }

  const showRecents = !q.trim() && recents.length > 0;
  const showSuggestions = q.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form className="relative w-full" onSubmit={submit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
        <Input
          aria-label="Buscador global"
          className="rounded-full bg-atlas-soft pl-9 pr-8 focus:bg-white"
          placeholder="Buscar en el portal…"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {showSuggestions && suggestions.isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-atlas-muted" />
        ) : null}
      </form>
      {open && (showRecents || showSuggestions) ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card">
          {showRecents ? (
            <div className="p-2">
              <p className="px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-atlas-muted">
                Búsquedas recientes
              </p>
              {recents.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => go(item)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-atlas-text hover:bg-atlas-soft"
                >
                  <Clock className="h-3.5 w-3.5 text-atlas-muted" />
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          {showSuggestions ? (
            <div className="border-t border-atlas-border p-2">
              <p className="px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-atlas-muted">
                Coincidencias
              </p>
              {suggestions.data?.items.length ? (
                suggestions.data.items.slice(0, 6).map((item) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    onClick={() => setRecents(addRecentSearch(q))}
                    className="flex flex-col rounded-lg px-2 py-1.5 hover:bg-atlas-soft"
                  >
                    <span className="text-sm font-medium text-atlas-text">
                      {item.title}
                    </span>
                    <span className="text-xs text-atlas-muted">
                      {item.kind}
                      {item.subtitle ? ` · ${item.subtitle}` : ""}
                    </span>
                  </Link>
                ))
              ) : suggestions.isFetching ? (
                <p className="px-2 py-1.5 text-xs text-atlas-muted">
                  Buscando…
                </p>
              ) : (
                <p className="px-2 py-1.5 text-xs text-atlas-muted">
                  Sin coincidencias todavía. Presiona Enter para ver todos los
                  resultados.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
