"use client";

import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Tooltip } from "@/shared/components/ui/tooltip";
import { IconPicker } from "./icon-picker";
import type { ContentBullet } from "./types";

type Cambiar = (
  actualizar: (current: ContentBullet[]) => ContentBullet[],
) => void;

function mover(lista: ContentBullet[], desde: number, hasta: number) {
  if (hasta < 0 || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [punto] = copia.splice(desde, 1);
  copia.splice(hasta, 0, punto);
  return copia;
}

/**
 * Los puntos de la lista, como tarjetas: icono dibujado, texto a varias líneas y las acciones del
 * punto a la derecha (destacar, subir, bajar, quitar).
 *
 * Antes cada punto era una caja de una línea con un desplegable de nombres y una casilla diminuta:
 * el texto de una idea completa no cabía, no se veía el icono y no se podía reordenar. Vive aparte
 * del formulario porque es el único bloque con estado de colección.
 */
export function BulletsEditor({
  bullets,
  onChange,
  contentKey,
}: Readonly<{
  bullets: ContentBullet[];
  onChange: Cambiar;
  contentKey: string;
}>) {
  const cambiar = (index: number, cambios: Partial<ContentBullet>) =>
    onChange((current) =>
      current.map((item, position) =>
        position === index ? { ...item, ...cambios } : item,
      ),
    );

  return (
    <section className="flex flex-col gap-3" aria-label="Puntos de la lista">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-atlas-text">
          {bullets.length === 0
            ? "Ningún punto"
            : bullets.length === 1
              ? "1 punto"
              : `${bullets.length} puntos`}
        </p>
        <p className="text-xs text-atlas-muted">
          Un icono y una idea por punto. El destacado se lee más fuerte.
        </p>
      </div>

      {bullets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-atlas-border px-4 py-5 text-center text-sm text-atlas-muted">
          Sin puntos: la app no pintará ninguna lista en esta pieza.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {bullets.map((bullet, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-2xl border border-atlas-border bg-white p-3 shadow-sm"
          >
            <IconPicker
              bullet={bullet}
              testId={`icon-${contentKey}-${index}`}
              onChange={(cambios) => cambiar(index, cambios)}
            />
            <textarea
              value={bullet.text}
              rows={2}
              placeholder="Escribe la idea de este punto"
              aria-label={`Texto del punto ${index + 1}`}
              onChange={(event) => cambiar(index, { text: event.target.value })}
              data-testid={`bullet-${contentKey}-${index}`}
              className="min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-atlas-border bg-white px-3 py-2 text-sm leading-5 text-atlas-text shadow-sm transition placeholder:text-atlas-muted focus-visible:border-atlas-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/30"
            />
            <div className="flex shrink-0 flex-col items-stretch gap-1">
              <Tooltip text="Un punto destacado se lee en negrita y más claro en la app.">
                <button
                  type="button"
                  aria-pressed={Boolean(bullet.emphasis)}
                  onClick={() => cambiar(index, { emphasis: !bullet.emphasis })}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                    bullet.emphasis
                      ? "border-atlas-accent bg-atlas-accentSoft text-atlas-accent"
                      : "border-atlas-border bg-white text-atlas-muted hover:text-atlas-text"
                  }`}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${bullet.emphasis ? "fill-current" : ""}`}
                    aria-hidden
                  />
                  Destacar
                </button>
              </Tooltip>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    onChange((current) => mover(current, index, index - 1))
                  }
                  aria-label={`Subir el punto ${index + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-atlas-border text-atlas-muted transition hover:text-atlas-text disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={index === bullets.length - 1}
                  onClick={() =>
                    onChange((current) => mover(current, index, index + 1))
                  }
                  aria-label={`Bajar el punto ${index + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-atlas-border text-atlas-muted transition hover:text-atlas-text disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                  aria-label={`Quitar el punto ${index + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-atlas-border text-atlas-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        onClick={() =>
          onChange((current) => [...current, { text: "", icon: null }])
        }
        data-testid={`add-bullet-${contentKey}`}
        className="self-start"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Añadir punto
      </Button>
    </section>
  );
}
