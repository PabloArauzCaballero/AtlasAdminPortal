"use client";

import { SURFACES } from "./surfaces";
import type { ContentSurface } from "./types";

/**
 * Las pestañas de pantallas: sólo las que tienen algo.
 *
 * Antes salían las diez siempre, y Inicio, Perfil y Crédito —que no tienen ningún texto de fábrica ni
 * piezas publicadas— eran pestañas que al abrirse decían «0 piezas» y «Nada publicado todavía»: ruido
 * que parecía contenido pendiente. Ahora una pantalla vacía no tiene pestaña; se añade su primera
 * pieza con «Nueva pieza» eligiendo la pantalla. La pestaña seleccionada se queda aunque esté vacía
 * (si no, al elegirla desde «Nueva pieza» desaparecería bajo los pies), y mientras no se sabe cuántas
 * piezas tiene una pantalla se enseña: esconder por no saber sería peor que enseñar de más.
 */
export function SurfaceTabs({
  surface,
  counts,
  onSelect,
}: Readonly<{
  surface: ContentSurface;
  counts: Partial<Record<ContentSurface, number>>;
  onSelect: (surface: ContentSurface) => void;
}>) {
  const hayContenido = (value: ContentSurface) =>
    counts[value] === undefined || (counts[value] ?? 0) > 0;
  const visibles = SURFACES.filter(
    (option) => option.value === surface || hayContenido(option.value),
  );
  const vacias = SURFACES.filter((option) => !visibles.includes(option));

  return (
    <div className="mb-5" data-testid="app-content-surfaces">
      <div className="flex flex-wrap gap-2">
        {visibles.map((option) => {
          const total = counts[option.value];
          const activa = surface === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              title={option.hint}
              data-testid={`surface-${option.value}`}
              aria-pressed={activa}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 focus-visible:ring-offset-1 ${
                activa
                  ? "border-atlas-accent/30 bg-atlas-accentSoft text-atlas-accent shadow-subtle"
                  : "border-atlas-border bg-white text-atlas-muted hover:border-slate-300 hover:bg-atlas-soft hover:text-atlas-text"
              }`}
            >
              {option.label}
              {typeof total === "number" ? (
                <span
                  className={`rounded-full px-1.5 py-px font-mono text-[10px] ${
                    activa ? "bg-white/70" : "bg-atlas-soft"
                  }`}
                >
                  {total}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {vacias.length > 0 ? (
        <p
          className="mt-2 text-xs text-atlas-muted"
          data-testid="surfaces-sin-piezas"
        >
          Sin piezas todavía: {vacias.map((option) => option.label).join(", ")}.
          Se añaden con «Nueva pieza», eligiendo la pantalla.
        </p>
      ) : null}
    </div>
  );
}
