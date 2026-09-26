"use client";

import { useEffect } from "react";
import {
  Check,
  CheckCircle2,
  Loader2,
  MousePointerClick,
  Navigation,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/**
 * Bloques de estado de la tarjeta, escritos para alguien que no lee: una
 * frase, en imperativo, que dice exactamente qué hacer ahora.
 */

/** Esperando la acción del usuario: «Tu turno» + la instrucción concreta. */
export function AwaitingNotice({ hint }: Readonly<{ hint?: string }>) {
  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-sm text-blue-900"
    >
      <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-5">
        <span className="font-semibold">Tu turno: </span>
        {hint ?? "haz la acción que se indica arriba para continuar."}
      </p>
    </div>
  );
}

/** La acción ya estaba hecha al llegar: no se salta el paso, se avisa. */
export function AlreadyDoneNotice() {
  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-900"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-5">
        <span className="font-semibold">Esto ya está hecho. </span>
        Pulsa «Siguiente» para continuar.
      </p>
    </div>
  );
}

/**
 * No está en pantalla lo que el paso explica: salida a mano, sin adivinar.
 * Si el paso vive en otra pantalla, «Llévame ahí»; si ya estamos en la suya,
 * es que no hay datos todavía y se dice así, con la salida (Siguiente).
 */
export function MissingNotice({
  onLocate,
  canLocate,
}: Readonly<{ onLocate: () => void; canLocate: boolean }>) {
  return (
    <div
      role="status"
      className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900"
    >
      <p className="flex items-start gap-2 leading-5">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
        <span>
          <span className="font-semibold">No veo en pantalla </span>
          lo que explica este paso.{" "}
          {canLocate
            ? "Puede que estés en otra pestaña."
            : "Puede que aún no haya datos aquí: pulsa «Siguiente» para continuar."}
        </span>
      </p>
      {canLocate ? (
        <Button
          variant="secondary"
          className="mt-2 w-full"
          onClick={onLocate}
          aria-label="Llévame a la pantalla de este paso"
        >
          <Navigation className="h-4 w-4" aria-hidden />
          Llévame ahí
        </Button>
      ) : null}
    </div>
  );
}

export function CompletionCard({
  cardRef,
  title,
  onClose,
}: Readonly<{
  cardRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  onClose: () => void;
}>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onClose]);
  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial completado: ${title}`}
      tabIndex={-1}
      className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-atlas-border bg-white p-5 text-center shadow-xl focus:outline-none"
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-atlas-text">
        ¡Tutorial completado!
      </h3>
      <p className="mt-1.5 text-sm text-atlas-muted">
        Terminaste «{title}». Tu progreso quedó guardado; puedes repetirlo
        cuando quieras desde el Centro de aprendizaje.
      </p>
      <Button variant="primary" className="mt-4 w-full" onClick={onClose}>
        Entendido
      </Button>
    </div>
  );
}
