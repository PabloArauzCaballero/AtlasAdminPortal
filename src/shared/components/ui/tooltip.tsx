"use client";

import {
  cloneElement,
  useCallback,
  useId,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import { Portal } from "./portal";

type Rect = { top: number; bottom: number; left: number; width: number };

type TriggerProps = {
  "aria-describedby"?: string;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * La explicación de un control que sólo es un icono.
 *
 * ## Por qué no basta con `title`
 *
 * El `title` del navegador tarda un segundo largo en aparecer, no se puede peinar y en un portal
 * con su propio lenguaje visual se ve como un recuadro del sistema operativo. Y sobre todo: no
 * sale nunca con el teclado, así que quien navega con tabulador no llega a leerlo.
 *
 * ## Por qué va por `Portal` y no en posición absoluta
 *
 * Porque casi todos estos botones viven dentro de algo que recorta. El cuerpo de una tabla es un
 * `overflow-auto` con altura máxima; los cajones y el lienzo de flujos son `overflow-hidden`. Una
 * burbuja en `absolute` se cortaría en el borde de la fila. Se mide el disparador y se pinta en
 * `fixed` sobre `document.body`, que es lo único que no recorta nadie.
 *
 * ## Accesibilidad
 *
 * El NOMBRE del control lo sigue dando su `aria-label`; esto es la DESCRIPCIÓN, y por eso se
 * enlaza con `aria-describedby` en vez de sustituir al nombre. Los manejadores van en el propio
 * control —no en un envoltorio— para que el foco del teclado la abra igual que el ratón, y
 * `Escape` la cierra sin mover el foco de sitio.
 */
export function Tooltip({
  text,
  children,
}: Readonly<{
  /** Qué hace el control, en una frase. No repitas el `aria-label` palabra por palabra. */
  text: string;
  children: ReactElement<TriggerProps>;
}>) {
  const [rect, setRect] = useState<Rect | null>(null);
  const id = useId();

  const show = useCallback((element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    setRect({
      top: box.top,
      bottom: box.bottom,
      left: box.left,
      width: box.width,
    });
  }, []);

  const hide = useCallback(() => setRect(null), []);

  const props = children.props;
  return (
    <>
      {cloneElement(children, {
        "aria-describedby": rect ? id : props["aria-describedby"],
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          show(event.currentTarget);
          props.onMouseEnter?.(event);
        },
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          hide();
          props.onMouseLeave?.(event);
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          show(event.currentTarget);
          props.onFocus?.(event);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          hide();
          props.onBlur?.(event);
        },
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
          if (event.key === "Escape") hide();
          props.onKeyDown?.(event);
        },
      })}
      {rect ? (
        <Portal>
          <TooltipBubble id={id} text={text} rect={rect} />
        </Portal>
      ) : null}
    </>
  );
}

/** Encima del control salvo que no quepa, y entonces debajo. Nunca fuera de la ventana. */
function TooltipBubble({
  id,
  text,
  rect,
}: Readonly<{ id: string; text: string; rect: Rect }>) {
  const ANCHO = 224;
  const debajo = rect.top < 96;
  const centro = rect.left + rect.width / 2;
  const left = Math.min(
    Math.max(8, centro - ANCHO / 2),
    Math.max(8, window.innerWidth - ANCHO - 8),
  );
  const vertical = debajo
    ? { top: rect.bottom + 8 }
    : { bottom: window.innerHeight - rect.top + 8 };

  return (
    <span
      role="tooltip"
      id={id}
      style={{ position: "fixed", left, width: ANCHO, ...vertical }}
      className="pointer-events-none z-[80] block rounded-lg border border-atlas-border bg-white px-2.5 py-1.5 text-xs leading-5 text-atlas-text shadow-lg"
    >
      {text}
    </span>
  );
}
