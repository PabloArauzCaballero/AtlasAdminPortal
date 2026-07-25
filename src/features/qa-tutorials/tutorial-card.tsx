"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MousePointerClick,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { LatencyDemoChart } from "./latency-demo-chart";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";

/**
 * Tarjeta del tutorial (presentacional): título, explicación orientada a
 * negocio, ejemplo, barra de progreso, controles y navegación por teclado.
 * El overlay se encarga de posicionarla; esto sólo pinta y captura foco.
 */
export function TutorialCard({
  step,
  phase,
  stepIndex,
  total,
  title,
  isLast,
  onNext,
  onPrev,
  onSkipStep,
  onSkipTutorial,
  onClose,
}: Readonly<{
  step: TutorialStep;
  phase: EnginePhase;
  stepIndex: number;
  total: number;
  title: string;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkipStep: () => void;
  onSkipTutorial: () => void;
  onClose: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const awaiting = phase === "awaiting-action";
  const missing = phase === "element-missing";
  const completed = phase === "completed";
  const percent = Math.round(((stepIndex + 1) / total) * 100);

  useEffect(() => {
    ref.current?.focus();
  }, [stepIndex, phase]);

  // Atajos de teclado a nivel documento (mismo patrón que dialog-shell): así
  // funcionan sin depender del foco y sin listeners sobre un rol no interactivo.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && stepIndex > 0) onPrev();
      else if (event.key === "ArrowRight" && !awaiting) onNext();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [stepIndex, awaiting, onClose, onPrev, onNext]);

  if (completed) {
    return <CompletionCard cardRef={ref} title={title} onClose={onClose} />;
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial: ${title} — paso ${stepIndex + 1} de ${total}`}
      tabIndex={-1}
      className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-atlas-border bg-white p-4 shadow-xl focus:outline-none"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-atlas-accent">
          {title} · {stepIndex + 1}/{total}
        </span>
        <button
          type="button"
          aria-label="Cerrar tutorial"
          onClick={onClose}
          className="rounded-md p-1 text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-atlas-soft">
        <div
          className="h-full rounded-full bg-atlas-accent transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>

      <h3 className="text-sm font-semibold text-atlas-text">{step.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-atlas-muted">
        {step.content}
      </p>
      {step.example ? (
        <p className="mt-3 rounded-lg border border-atlas-border bg-atlas-soft p-2.5 text-xs leading-5 text-atlas-text">
          <span className="font-semibold">Ejemplo — </span>
          {step.example}
        </p>
      ) : null}
      {step.demo === "latency" ? <LatencyDemoChart /> : null}

      {missing ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-atlas-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Ubicando el elemento en esta pantalla… o continúa con «Siguiente».
        </p>
      ) : null}
      {awaiting ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <MousePointerClick className="h-3.5 w-3.5" />
          {step.validation?.hint ?? "Realiza la acción para continuar…"}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkipTutorial}
          className="text-xs text-atlas-muted underline hover:text-atlas-text"
        >
          Omitir tutorial
        </button>
        <div className="flex items-center gap-1.5">
          {stepIndex > 0 ? (
            <Button variant="ghost" onClick={onPrev} aria-label="Paso anterior">
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>
          ) : null}
          {(step.optional || awaiting) && !isLast ? (
            <Button
              variant="secondary"
              onClick={onSkipStep}
              aria-label="Omitir este paso"
            >
              <SkipForward className="h-4 w-4" />
              Omitir paso
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={onNext}
            disabled={awaiting && !step.optional}
            aria-label={isLast ? "Finalizar tutorial" : "Siguiente paso"}
            className={cn(awaiting && !step.optional && "opacity-60")}
          >
            {isLast ? <Check className="h-4 w-4" /> : null}
            {isLast ? "Finalizar" : "Siguiente"}
            {!isLast ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompletionCard({
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
