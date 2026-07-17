"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Base accesible para todo lo que se monte sobre un backdrop (modales y
 * drawers). Centraliza lo que antes no hacía ninguno: foco inicial dentro del
 * panel, focus-trap, cierre con Escape, devolución del foco al disparador y
 * `aria-labelledby` hacia el título real.
 *
 * No cierra al hacer click en el backdrop por defecto: estos diálogos
 * confirman acciones destructivas y un click accidental fuera no debería
 * descartar lo que el operador escribió.
 */
export function DialogShell({
  open,
  labelledBy,
  onClose,
  closeOnBackdrop = false,
  overlayClassName,
  panelClassName,
  children,
}: Readonly<{
  open: boolean;
  /** Id del elemento que titula el diálogo (normalmente un <h2>). */
  labelledBy: string;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
  children: React.ReactNode;
}>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const first =
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panelRef.current)?.focus();
    return () => {
      // Al cerrar, el foco vuelve a donde estaba: si no, aterriza en <body> y
      // quien navega con teclado pierde el sitio.
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function focusables(): HTMLElement[] {
      return [
        ...(panelRef.current?.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        ) ?? []),
      ];
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // El trap: sin esto, tabular sale del modal hacia la página de fondo,
      // que sigue siendo operable aunque visualmente esté tapada.
      if (!panelRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // El backdrop cierra con el ratón como atajo; el equivalente accesible es
    // Escape, que este mismo componente implementa y cubre con tests. No se le
    // pone role interactivo a propósito: es decorado, no un control que deba
    // anunciarse ni recibir foco.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cn("fixed inset-0", overlayClassName)}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn("outline-none", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}
