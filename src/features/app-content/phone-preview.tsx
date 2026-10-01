"use client";

import { Smartphone } from "lucide-react";
import { PhoneScreen } from "./phone-screens";
import { PHONE } from "./phone-theme";
import { ActionPill, IconChip } from "./phone-ui";
import type { ContentActionKind, ContentBullet, ContentSurface } from "./types";

/** Lo que se está escribiendo ahora mismo, tal cual está en el formulario (sin guardar). */
export type PreviewDraft = {
  /** La clave de la pieza: la Bienvenida distingue `eslogan` de los pasos por ella. */
  contentKey?: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: ContentBullet[];
  actionKind: ContentActionKind | null;
  actionLabel: string;
  isActive: boolean;
};

/**
 * El celular de la derecha: enseña el texto mientras se escribe, como lo pinta la app.
 *
 * La app es OSCURA y se maqueta aquí al ancho lógico de un teléfono (390 px) y se reduce: cada
 * medida, color, tamaño de letra e icono es el de la app (`phone-theme.ts`, `app-icons.tsx`), en
 * lugar de una maqueta clara aproximada. Lo único que no es idéntico es la tipografía (la app usa
 * Manrope y el portal no la carga) y las animaciones.
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
  const { width, height, scale } = PHONE;

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
      <div className="rounded-[2.25rem] border-[7px] border-slate-800 bg-slate-800 shadow-xl">
        <div
          className="relative overflow-hidden rounded-[1.7rem]"
          style={{
            width: width * scale,
            height: height * scale,
            background: PHONE.bg,
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left overflow-y-auto"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              background: PHONE.bg,
              color: PHONE.text1,
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-48 -top-56 h-[560px] w-[560px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(43,224,168,0.22) 0%, rgba(20,168,148,0.09) 45%, rgba(20,168,148,0) 70%)",
              }}
            />
            <div className="relative flex min-h-full flex-col gap-4 px-5 pb-8 pt-12">
              <span
                aria-hidden
                className="absolute left-1/2 top-3 h-[26px] w-28 -translate-x-1/2 rounded-full bg-black"
              />
              {pieces.length === 0 ? (
                <p
                  className="pt-24 text-center text-[15px] leading-[23px]"
                  style={{ color: PHONE.text2 }}
                >
                  Nada publicado todavía. Escribe una pieza y aparecerá aquí.
                </p>
              ) : (
                <PhoneScreen
                  surface={surface}
                  pieces={pieces}
                  isDraft={draft !== null}
                />
              )}
            </div>
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
        className="pt-24 text-center text-[15px] leading-[23px]"
        style={{ color: PHONE.text2 }}
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
        <p
          className="rounded-lg px-3 py-1.5 text-[13px]"
          style={{ background: "rgba(255,255,255,0.07)", color: PHONE.text2 }}
        >
          Oculta: el cliente no la verá.
        </p>
      ) : null}
      {piece.title.trim() ? (
        <h4
          className="break-words text-[17px] font-bold leading-[23px]"
          style={{ color: PHONE.text1 }}
        >
          {piece.title}
        </h4>
      ) : null}
      {piece.subtitle.trim() ? (
        <p
          className="break-words text-[15px] font-semibold leading-[23px]"
          style={{ color: PHONE.text1 }}
        >
          {piece.subtitle}
        </p>
      ) : null}
      {piece.body.trim() ? (
        <p
          className="whitespace-pre-wrap break-words text-[15px] font-medium leading-[23px]"
          style={{ color: PHONE.text2 }}
        >
          {piece.body}
        </p>
      ) : null}
      {piece.bullets.some((bullet) => bullet.text.trim()) ? (
        <ul className="mt-1 flex flex-col gap-2">
          {piece.bullets
            .filter((bullet) => bullet.text.trim())
            .map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
                <IconChip name={bullet.icon} image={bullet.iconImage} />
                <span
                  className={`min-w-0 flex-1 break-words text-[15px] ${
                    bullet.emphasis
                      ? "font-bold leading-5"
                      : "font-medium leading-[23px]"
                  }`}
                  style={{ color: bullet.emphasis ? PHONE.text1 : PHONE.text2 }}
                >
                  {bullet.text}
                </span>
              </li>
            ))}
        </ul>
      ) : null}
      {hasAction ? (
        <ActionPill kind={piece.actionKind} label={piece.actionLabel} />
      ) : null}
    </article>
  );
}
