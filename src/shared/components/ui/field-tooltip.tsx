"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Portal } from "./portal";

type Rect = { top: number; bottom: number; left: number; width: number };

/** Ancho máximo de la burbuja (px). */
const ANCHO = 288;

/**
 * El «qué poner» de un campo: el icono ⓘ junto a la etiqueta.
 *
 * Abre con el ratón y con el foco del propio icono, y también cuando el control del campo recibe
 * el foco (`open`), para que quien rellena con el teclado lea la ayuda sin ir a buscarla. Cierra
 * al salir, al perder el foco y con `Escape` sin mover el ratón (WCAG 1.4.13).
 *
 * El texto vive SIEMPRE en un `<span>` oculto con `id={describedById}`: el control lo enlaza con
 * `aria-describedby` y el lector lo lee aunque la burbuja esté cerrada. La burbuja va por
 * `Portal` en posición fija porque casi todos los campos viven dentro de algo que recorta.
 *
 * Va FUERA del `<label>`, y su nombre accesible sale de `title`, NO de `aria-label`: medido en el
 * ERP, `getByLabel("Ciudad")` de Playwright casa también con `aria-label="Ayuda: Ciudad"` y devuelve
 * dos elementos, así que el E2E del campo se rompe sin que la pantalla tenga nada malo. Con `title`
 * el botón sigue teniendo nombre accesible («Ayuda: Ciudad») y no compite con el del control.
 */
export function FieldTooltip({
  label,
  text,
  describedById,
  open = false,
  className,
}: Readonly<{
  /** Etiqueta del campo: da nombre al botón («Ayuda: Correo»). */
  label: string;
  /** Qué poner y por qué importa, con ejemplo si el formato no es obvio. */
  text: string;
  /** Id del texto oculto al que apunta el `aria-describedby` del control. */
  describedById?: string;
  /** Forzada desde fuera (el control del campo tiene el foco). */
  open?: boolean;
  className?: string;
}>) {
  const ownId = useId();
  const hiddenId = describedById ?? `${ownId}-ayuda`;
  const bubbleId = `${ownId}-burbuja`;
  const trigger = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  const visible = (hover || focus || open) && !dismissed;

  useEffect(() => {
    if (!visible) {
      setRect(null);
      return;
    }
    const measure = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;
      setRect({
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
      });
    };
    measure();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  // Al dejar de estar activada (ratón fuera, sin foco) se olvida el Escape: la próxima vez abre.
  useEffect(() => {
    if (!hover && !focus && !open) setDismissed(false);
  }, [hover, focus, open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title={`Ayuda: ${label}`}
        aria-describedby={hiddenId}
        aria-expanded={visible}
        data-field-help
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-atlas-muted transition-colors hover:text-atlas-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40",
          className,
        )}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onClick={() => setDismissed((value) => !value)}
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      <span id={hiddenId} className="sr-only">
        {text}
      </span>
      {visible && rect ? (
        <Portal>
          <TooltipBubble id={bubbleId} text={text} rect={rect} />
        </Portal>
      ) : null}
    </>
  );
}

/** Encima del icono salvo que no quepa, y entonces debajo. Nunca fuera de la ventana. */
function TooltipBubble({
  id,
  text,
  rect,
}: Readonly<{ id: string; text: string; rect: Rect }>) {
  const ancho = Math.min(ANCHO, window.innerWidth - 16);
  const debajo = rect.top < 120;
  const centro = rect.left + rect.width / 2;
  const left = Math.min(
    Math.max(8, centro - ancho / 2),
    Math.max(8, window.innerWidth - ancho - 8),
  );
  const vertical = debajo
    ? { top: rect.bottom + 6 }
    : { bottom: window.innerHeight - rect.top + 6 };

  return (
    <span
      role="tooltip"
      id={id}
      data-field-tooltip
      style={{ position: "fixed", left, maxWidth: ancho, ...vertical }}
      className="pointer-events-none z-[80] block rounded-lg border border-atlas-border bg-white px-3 py-2 text-xs leading-5 text-atlas-text shadow-lg"
    >
      {text}
    </span>
  );
}
