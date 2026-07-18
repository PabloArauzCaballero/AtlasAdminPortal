"use client";

import { Clock, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useGlobalSearch } from "@/features/search/hooks";
import type { GlobalSearchResult } from "@/features/search/types";
import { Input } from "@/shared/components/ui/input";
import {
  addRecentSearch,
  getRecentSearches,
} from "@/shared/lib/local-search-history";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

/** Resultado cuyo `href` ya pasó la validación de ruta interna al normalizar. */
type SafeSuggestion = GlobalSearchResult & { href: string };

/** Opción navegable por teclado: una reciente o una sugerencia con destino. */
type Option =
  | { type: "recent"; value: string }
  | { type: "suggestion"; suggestion: SafeSuggestion };

export function GlobalSearchBox() {
  const router = useRouter();
  const listboxId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebouncedValue(q, 350);
  const suggestions = useGlobalSearch(open ? debouncedQ.trim() : "");
  // Un resultado sin destino interno seguro no se ofrece como sugerencia: en un
  // desplegable no hay forma útil de mostrarlo como texto no navegable.
  const safeSuggestions = (suggestions.data?.items ?? [])
    .filter((item): item is SafeSuggestion => Boolean(item.href))
    .slice(0, 6);

  useEffect(() => setRecents(getRecentSearches()), [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showRecents = !q.trim() && recents.length > 0;
  const showSuggestions = q.trim().length > 0;

  // Solo una lista se muestra a la vez (recientes cuando la query está vacía,
  // coincidencias cuando hay texto), así que el teclado navega una sola.
  const options: Option[] = showRecents
    ? recents.map((value) => ({ type: "recent", value }))
    : safeSuggestions.map((suggestion) => ({ type: "suggestion", suggestion }));

  // Al cambiar la lista, el resaltado vuelve a "ninguno": mantenerlo apuntaría a
  // un elemento que ya no está.
  useEffect(() => setActiveIndex(-1), [q, open]);

  function optionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  function go(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecents(addRecentSearch(trimmed));
    setOpen(false);
    router.push(`/internal/search?q=${encodeURIComponent(trimmed)}`);
  }

  function activate(option: Option) {
    if (option.type === "recent") {
      go(option.value);
      return;
    }
    setRecents(addRecentSearch(q));
    setOpen(false);
    router.push(option.suggestion.href);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter sobre una opción resaltada la abre; sin resaltado, busca la query.
    if (activeIndex >= 0 && options[activeIndex]) {
      activate(options[activeIndex]);
      return;
    }
    go(q);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? options.length - 1 : current - 1,
      );
    }
  }

  const listboxOpen = open && (showRecents || showSuggestions);

  return (
    <div ref={containerRef} className="relative w-full">
      <form className="relative w-full" onSubmit={submit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-muted" />
        <Input
          aria-label="Buscador global"
          role="combobox"
          aria-expanded={listboxOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          className="rounded-full bg-atlas-soft pl-9 pr-8 focus:bg-white"
          placeholder="Buscar en el portal…"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {showSuggestions && suggestions.isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-atlas-muted" />
        ) : null}
      </form>
      {listboxOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Resultados de búsqueda"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card"
        >
          {showRecents ? (
            <div className="p-2">
              <p className="px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-atlas-muted">
                Búsquedas recientes
              </p>
              {recents.map((item, index) => (
                <button
                  key={item}
                  id={optionId(index)}
                  role="option"
                  aria-selected={activeIndex === index}
                  type="button"
                  onClick={() => go(item)}
                  className={optionClass(activeIndex === index)}
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
              {safeSuggestions.length ? (
                safeSuggestions.map((item, index) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={activeIndex === index}
                    href={item.href}
                    onClick={() => setRecents(addRecentSearch(q))}
                    className={`flex flex-col rounded-lg px-2 py-1.5 ${
                      activeIndex === index ? "bg-atlas-soft" : ""
                    }`}
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

function optionClass(active: boolean) {
  return `flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-atlas-text hover:bg-atlas-soft ${
    active ? "bg-atlas-soft" : ""
  }`;
}
