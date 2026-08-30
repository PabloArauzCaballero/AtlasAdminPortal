"use client";

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
    <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
      <legend className="px-1 text-xs text-slate-400">
        Puntos de la lista
      </legend>
      {bullets.map((bullet, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
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
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <input
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
            className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
          />
          <label className="flex items-center gap-1 text-xs text-slate-400">
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
            />
            destacar
          </label>
          <button
            type="button"
            onClick={() =>
              onChange((current) =>
                current.filter((_, position) => position !== index),
              )
            }
            className="text-xs text-rose-300"
          >
            quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange((current) => [...current, { text: "", icon: null }])
        }
        data-testid={`add-bullet-${contentKey}`}
        className="self-start text-xs text-sky-300"
      >
        + añadir punto
      </button>
    </fieldset>
  );
}
