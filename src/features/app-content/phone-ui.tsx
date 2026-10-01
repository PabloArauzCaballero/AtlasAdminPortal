"use client";

import type { CSSProperties, ReactNode } from "react";
import { AppIcon } from "./app-icons";
import { PHONE } from "./phone-theme";

/** La tarjeta de la app: superficie opaca con filo, no un velo sobre el fondo. */
export function AppCard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: PHONE.card, border: `1px solid ${PHONE.line}` }}
    >
      {children}
    </div>
  );
}

/** El icono de un punto de lista: chip de 32 px con el glifo de la app, o la imagen propia. */
export function IconChip({
  name,
  image,
}: Readonly<{ name?: string | null; image?: string | null }>) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
      style={{ background: PHONE.successSoft }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URI de 96 px
        <img src={image} alt="" className="h-5 w-5 object-contain" />
      ) : (
        <AppIcon name={name ?? "check"} size={16} tint={PHONE.brand400} />
      )}
    </span>
  );
}

/** El botón principal: píldora con el degradado de marca y texto oscuro encima. */
export function BrandButton({
  label,
  style,
}: Readonly<{ label: string; style?: CSSProperties }>) {
  return (
    <span
      className="flex min-h-12 items-center justify-center rounded-full px-5 text-[15px] font-bold"
      style={{
        background: PHONE.brandGradient,
        color: PHONE.brand900,
        boxShadow: "0 8px 24px rgba(43,224,168,0.25)",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

/** El botón del final de una pieza (WhatsApp, recorrido, pantalla): píldora con borde. */
export function ActionPill({
  kind,
  label,
}: Readonly<{ kind: string | null; label: string }>) {
  const whatsapp = kind === "whatsapp";
  const ink = whatsapp ? PHONE.whatsapp : PHONE.brand400;
  const icon =
    kind === "whatsapp"
      ? "telefono"
      : kind === "tour"
        ? "refrescar"
        : "adelante";
  return (
    <span
      className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-bold"
      style={{
        border: `1px solid ${ink}`,
        background: whatsapp ? `${PHONE.whatsapp}14` : PHONE.card,
        color: ink,
      }}
    >
      <AppIcon name={icon} size={18} tint={ink} />
      {label}
    </span>
  );
}
