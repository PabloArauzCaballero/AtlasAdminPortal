"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIcon, APP_ICON_NAMES } from "./app-icons";
import { ICON_LABELS } from "./icon-options";
import { iconFromFile, IconUploadError } from "./icon-upload";
import { PHONE } from "./phone-theme";
import type { ContentBullet } from "./types";

/**
 * El icono de un punto: se ve DIBUJADO, tal como lo pinta la app.
 *
 * El botón enseña el icono actual sobre el fondo oscuro de la app y abre una rejilla con todos los
 * iconos de Atlas dibujados (elegir «chispa» por nombre obliga a adivinar cómo se ve). Debajo, «Cargar
 * el tuyo»: PNG o WebP, reescalado en el navegador. El propio GANA sobre el de la lista mientras
 * exista; quitarlo devuelve el de Atlas sin perder la elección anterior.
 */
export function IconPicker({
  bullet,
  onChange,
  testId,
}: Readonly<{
  bullet: ContentBullet;
  onChange: (cambios: Partial<ContentBullet>) => void;
  testId: string;
}>) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [arriba, setArriba] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actual = bullet.icon ?? "check";

  useEffect(() => {
    if (!open) return;
    const fuera = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const tecla = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [open]);

  const cargar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onChange({ iconImage: await iconFromFile(file) });
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof IconUploadError
          ? caught.message
          : "No se pudo cargar el icono.",
      );
    }
  };

  return (
    <div ref={root} className="relative flex shrink-0 items-start gap-1">
      <button
        type="button"
        onClick={() => {
          const caja = root.current?.getBoundingClientRect();
          // La rejilla mide ~400 px: si abajo no cabe y arriba sí, se abre hacia arriba.
          setArriba(
            Boolean(caja) &&
              window.innerHeight - (caja?.bottom ?? 0) < 420 &&
              (caja?.top ?? 0) > 420,
          );
          setOpen((value) => !value);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Icono: ${bullet.iconImage ? "propio" : (ICON_LABELS[actual] ?? actual)}. Cambiar`}
        data-testid={`${testId}-boton`}
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-atlas-border shadow-sm transition hover:border-atlas-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
        style={{ background: PHONE.bg }}
      >
        {bullet.iconImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI de 96 px
          <img
            src={bullet.iconImage}
            alt="Icono propio"
            data-testid={`${testId}-imagen`}
            className="h-7 w-7 object-contain"
          />
        ) : (
          <AppIcon name={actual} size={24} tint={PHONE.brand400} />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/webp"
        className="sr-only"
        data-testid={`${testId}-archivo`}
        onChange={(event) => {
          void cargar(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {bullet.iconImage ? (
        <button
          type="button"
          onClick={() => onChange({ iconImage: null })}
          aria-label="Quitar el icono propio y volver al de Atlas"
          className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-atlas-muted transition hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="Elegir icono"
          className={`absolute left-0 ${arriba ? "bottom-14" : "top-14"} z-30 w-[352px] rounded-2xl border border-atlas-border bg-white p-3 shadow-xl`}
        >
          <p className="mb-2 text-xs font-medium text-atlas-muted">
            Iconos de Atlas
          </p>
          <div
            className="grid max-h-72 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl p-2"
            style={{ background: PHONE.bg }}
          >
            {APP_ICON_NAMES.map((name) => {
              const elegido = !bullet.iconImage && name === actual;
              return (
                <button
                  key={name}
                  type="button"
                  title={ICON_LABELS[name] ?? name}
                  aria-label={ICON_LABELS[name] ?? name}
                  aria-pressed={elegido}
                  data-testid={`${testId}-icono-${name}`}
                  onClick={() => {
                    onChange({ icon: name, iconImage: null });
                    setOpen(false);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-lg transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
                  style={{
                    background: elegido ? PHONE.successSoft : undefined,
                    boxShadow: elegido
                      ? `inset 0 0 0 1.5px ${PHONE.brand400}`
                      : undefined,
                  }}
                >
                  <AppIcon name={name} size={22} tint={PHONE.brand400} />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-atlas-border px-3 py-2.5 text-sm font-medium text-atlas-text transition hover:border-atlas-accent hover:bg-atlas-soft"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Cargar el tuyo
          </button>
          <p className="mt-1.5 text-center text-[11px] text-atlas-muted">
            PNG o WebP · se reduce a 96 px · máximo 32 KB
          </p>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="absolute left-0 top-[3.6rem] z-20 w-64 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
