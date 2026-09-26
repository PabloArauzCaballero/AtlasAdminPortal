"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { DecisionTreeDemo } from "./decision-tree-demo";
import { LatencyDemoChart } from "./latency-demo-chart";
import {
  AlreadyDoneNotice,
  AwaitingNotice,
  CompletionCard,
  MissingNotice,
} from "./tutorial-card-parts";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";
import { Tooltip } from "@/shared/components/ui/tooltip";

/**
 * Tarjeta del tutorial (presentacional): qué paso es, qué hacer AHORA, y los
 * controles. Pensada para quien no lee: la instrucción va en una caja aparte
 * y en imperativo; la explicación larga y el ejemplo quedan plegados.
 * El overlay se encarga de posicionarla y medirla; esto sólo pinta y captura foco.
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
  onLocate,
  canLocate,
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
  onLocate: () => void;
  canLocate: boolean;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const awaiting = phase === "awaiting-action";
  const done = phase === "action-done";
  const missing = phase === "element-missing";
  const completed = phase === "completed";
  const nextDisabled = awaiting && !step.optional;
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
      else if (event.key === "ArrowRight" && !nextDisabled) onNext();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [stepIndex, nextDisabled, onClose, onPrev, onNext]);

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
      className="atlas-scrollbar pointer-events-auto max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-atlas-border bg-white p-4 shadow-xl focus:outline-none"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-atlas-accent">
          {title} · paso {stepIndex + 1} de {total}
        </span>
        <Tooltip text="Cierra el tutorial. El progreso queda guardado y puedes retomarlo donde lo dejaste.">
          <button
            type="button"
            aria-label="Cerrar tutorial"
            onClick={onClose}
            className="rounded-md p-1 text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
          >
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-atlas-soft">
        <div
          className="h-full rounded-full bg-atlas-accent transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>

      <h3 className="text-base font-semibold text-atlas-text">{step.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-atlas-muted">
        {step.content}
      </p>
      {step.example ? (
        <details className="group mt-2 rounded-lg border border-atlas-border bg-atlas-soft/60 text-xs text-atlas-text">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2.5 py-1.5 font-semibold text-atlas-muted hover:text-atlas-text">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Ver un ejemplo
          </summary>
          <p className="border-t border-atlas-border px-2.5 py-2 leading-5">
            {step.example}
          </p>
        </details>
      ) : null}
      {step.demo === "latency" ? <LatencyDemoChart /> : null}
      {step.demo === "decision-tree" ? <DecisionTreeDemo /> : null}

      {awaiting ? <AwaitingNotice hint={step.validation?.hint} /> : null}
      {done ? <AlreadyDoneNotice /> : null}
      {missing ? (
        <MissingNotice onLocate={onLocate} canLocate={canLocate} />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkipTutorial}
          className="whitespace-nowrap text-xs text-atlas-muted underline hover:text-atlas-text"
        >
          Omitir tutorial
        </button>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {stepIndex > 0 ? (
            <Button variant="ghost" onClick={onPrev} aria-label="Paso anterior">
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>
          ) : null}
          {awaiting && !isLast ? (
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
            disabled={nextDisabled}
            aria-label={isLast ? "Finalizar tutorial" : "Siguiente paso"}
            className={cn(nextDisabled && "opacity-60")}
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
