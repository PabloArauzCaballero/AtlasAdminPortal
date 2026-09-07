"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { ContentBullet } from "./types";

/**
 * Los puntos de la lista, editables uno a uno.
 *
 * Vive aparte de la tarjeta porque es el único bloque del formulario con estado propio de
 * colección —añadir, borrar y reordenar— y mezclarlo con los seis campos planos hacía que la
 * tarjeta pasara del tope de tamaño del repositorio.
 */
export function BulletsEditor({
  bullets,
  onChange,
  contentKey,
}: Readonly<{
  bullets: ContentBullet[];
  onChange: (actualizar: (current: ContentBullet[]) => ContentBullet[]) => void;
  contentKey: string;
}>) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-atlas-border bg-atlas-soft/60 p-3">
      <legend className="px-1 text-sm font-medium text-atlas-text">
        Puntos de la lista
      </legend>
      {bullets.length === 0 ? (
        <p className="px-1 text-xs text-atlas-muted">
          Sin puntos. La app no pintará ninguna lista en esta entrada.
        </p>
      ) : null}
      {bullets.map((bullet, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Input
            value={bullet.text}
            onChange={(event) =>
              onChange((current) =>
                current.map((item, position) =>
                  position === index
                    ? { ...item, text: event.target.value }
                    : item,
                ),
              )
            }
            data-testid={`bullet-${contentKey}-${index}`}
            className="h-10 min-w-48 flex-1"
          />
          <Input
            value={bullet.icon ?? ""}
            placeholder="icono"
            onChange={(event) =>
              onChange((current) =>
                current.map((item, position) =>
                  position === index
                    ? { ...item, icon: event.target.value || null }
                    : item,
                ),
              )
            }
            className="h-10 w-28 shrink-0 text-xs"
          />
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-atlas-text">
            <input
              type="checkbox"
              checked={Boolean(bullet.emphasis)}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, position) =>
                    position === index
                      ? { ...item, emphasis: event.target.checked }
                      : item,
                  ),
                )
              }
              className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
            />
            destacar
          </label>
          <Button
            variant="ghost"
            onClick={() =>
              onChange((current) =>
                current.filter((_, position) => position !== index),
              )
            }
            aria-label={`Quitar el punto ${index + 1}`}
            className="h-10 w-10 shrink-0 px-0 text-atlas-muted hover:text-red-600"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
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
    </fieldset>
  );
}
