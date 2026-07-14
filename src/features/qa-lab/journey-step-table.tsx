"use client";

import { Plus } from "lucide-react";
import type { QaJourneyStepSpec } from "./journey-types";
import { emptyStep } from "./journey-form";
import { Button } from "@/shared/components/ui/button";
import { JourneyStepCard } from "./journey-step-card";

/**
 * Editor visual de la secuencia de pasos, alternativo al JSON/archivo: cada
 * paso es una card ordenable en vez de una fila de tabla cruda, porque los
 * campos JSON por paso (payload, extract, etc.) no caben legibles en celdas
 * angostas. `steps` es la única fuente de verdad — el llamador la serializa
 * a texto si necesita mostrarla en el editor JSON.
 */
export function JourneySequenceTable({
  steps,
  onChange,
}: Readonly<{
  steps: QaJourneyStepSpec[];
  onChange: (steps: QaJourneyStepSpec[]) => void;
}>) {
  function updateStep(index: number, next: QaJourneyStepSpec) {
    onChange(steps.map((step, i) => (i === index ? next : step)));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function addStep() {
    onChange([...steps, emptyStep(steps.length + 1)]);
  }

  return (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-atlas-border bg-atlas-soft p-6 text-center text-sm text-atlas-muted">
          Sin pasos todavía. Agrega el primero para armar la secuencia.
        </div>
      ) : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={index}>
              <JourneyStepCard
                order={index + 1}
                step={step}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
                onChange={(next) => updateStep(index, next)}
                onMoveUp={() => moveStep(index, -1)}
                onMoveDown={() => moveStep(index, 1)}
                onRemove={() => removeStep(index)}
              />
            </li>
          ))}
        </ol>
      )}
      <Button variant="secondary" onClick={addStep}>
        <Plus className="h-4 w-4" />
        Agregar paso
      </Button>
    </div>
  );
}
