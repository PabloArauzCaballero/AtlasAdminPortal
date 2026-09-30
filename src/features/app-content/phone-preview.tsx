"use client";

import { Smartphone } from "lucide-react";
import { PhoneScreen } from "./phone-screens";
import type { ContentActionKind, ContentBullet, ContentSurface } from "./types";

/** Lo que se está escribiendo ahora mismo, tal cual está en el formulario (sin guardar). */
export type PreviewDraft = {
  title: string;
  subtitle: string;
  body: string;
  bullets: ContentBullet[];
  actionKind: ContentActionKind | null;
  actionLabel: string;
  isActive: boolean;
};

/**
 * El celular de la derecha: enseña el texto mientras se escribe.
 *
 * Existe porque quien edita escribía a ciegas: el formulario no dice cómo queda el texto en la app
 * (dónde corta una línea, qué peso tiene un punto destacado, si el botón cabe) y la única forma de
 * verlo era guardar y abrir la app. Es una aproximación fiel de la maqueta, no la app: no usa sus
 * fuentes ni sus iconos exactos.
 *
 * Sin borrador (nadie está editando) muestra lo ya publicado en la superficie, para que el celular
 * no quede vacío y sirva también para revisar de un vistazo.
 */
export function PhonePreview({
  surface,
  surfaceLabel,
  draft,
  published,
}: Readonly<{
  surface: ContentSurface;
  surfaceLabel: string;
  draft: PreviewDraft | null;
  published: PreviewDraft[];
}>) {
  const pieces = draft ? [draft] : published;

  return (
    <aside
      aria-label="Vista previa en el celular"
      data-testid="app-content-phone"
      className="flex flex-col items-center gap-2"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-atlas-muted">
        <Smartphone className="h-3.5 w-3.5" aria-hidden />
        {draft ? "Así se ve lo que escribes" : `Publicado en ${surfaceLabel}`}
      </p>
      <div className="w-[280px] rounded-[2.25rem] border-[7px] border-slate-800 bg-slate-800 shadow-xl">
        <div className="relative h-[540px] overflow-y-auto rounded-[1.7rem] bg-white">
          <div className="sticky top-0 z-10 flex justify-center bg-white/95 pb-1 pt-2">
            <span className="h-4 w-20 rounded-full bg-slate-800" aria-hidden />
          </div>
          <div className="flex flex-col gap-4 px-4 pb-6 pt-2">
            {pieces.length === 0 ? (
              <p className="pt-16 text-center text-xs leading-5 text-atlas-muted">
                Nada publicado todavía. Escribe una pieza y aparecerá aquí.
              </p>
            ) : null}
            {pieces.length > 0 ? (
              <PhoneScreen
                surface={surface}
                pieces={pieces}
                isDraft={draft !== null}
              />
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Piece({
  piece,
  isDraft,
}: Readonly<{ piece: PreviewDraft; isDraft: boolean }>) {
  const empty =
    !piece.title.trim() &&
    !piece.subtitle.trim() &&
    !piece.body.trim() &&
    piece.bullets.every((bullet) => !bullet.text.trim());
  const hasAction = piece.actionKind && piece.actionLabel.trim();

  if (empty) {
    return (
      <p
        className="pt-16 text-center text-xs leading-5 text-atlas-muted"
        data-testid="phone-empty"
      >
        Empieza a escribir y el texto aparece aquí.
      </p>
    );
  }

  return (
    <article
      className={`flex flex-col gap-2 ${piece.isActive ? "" : "opacity-50"}`}
      data-testid="phone-piece"
    >
      {!piece.isActive && isDraft ? (
        <p className="rounded bg-slate-100 px-2 py-1 text-[11px] text-atlas-muted">
          Oculta: el cliente no la verá.
        </p>
      ) : null}
      {piece.title.trim() ? (
        <h4 className="break-words text-base font-semibold leading-snug text-atlas-text">
          {piece.title}
        </h4>
      ) : null}
      {piece.subtitle.trim() ? (
        <p className="break-words text-sm font-medium leading-5 text-atlas-text">
          {piece.subtitle}
        </p>
      ) : null}
      {piece.body.trim() ? (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-atlas-muted">
          {piece.body}
        </p>
      ) : null}
      {piece.bullets.some((bullet) => bullet.text.trim()) ? (
        <ul className="mt-1 flex flex-col gap-2">
          {piece.bullets
            .filter((bullet) => bullet.text.trim())
            .map((bullet, index) => (
              <li key={index} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    bullet.emphasis
                      ? "bg-atlas-accentSoft text-atlas-accent"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`break-words text-[13px] leading-5 ${
                    bullet.emphasis
                      ? "font-semibold text-atlas-text"
                      : "text-atlas-muted"
                  }`}
                >
                  {bullet.text}
                </span>
              </li>
            ))}
        </ul>
      ) : null}
      {hasAction ? (
        <span
          className={`mt-1 rounded-full border px-4 py-2 text-center text-sm font-semibold ${
            piece.actionKind === "whatsapp"
              ? "border-[#128C7E] bg-[#128C7E]/10 text-[#128C7E]"
              : "border-atlas-accent bg-white text-atlas-accent"
          }`}
        >
          {piece.actionLabel}
        </span>
      ) : null}
    </article>
  );
}
