"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { explainError } from "./error-catalog";
import { getTutorial } from "./catalog";
import { useTutorial } from "./tutorial-provider";

/**
 * Ayuda contextual para un error conocido: explicación en lenguaje natural,
 * causas, solución, acción recomendada, enlace al tutorial en el paso exacto y
 * detalle técnico plegable. Si el código no está catalogado, muestra el detalle
 * técnico tal cual (nunca oculta información al usuario).
 */
export function ErrorHelpCard({
  code,
  technicalDetail,
  supportId,
  className,
}: Readonly<{
  code: string;
  technicalDetail?: string;
  supportId?: string;
  className?: string;
}>) {
  const { start } = useTutorial();
  const [open, setOpen] = useState(false);
  const explanation = explainError(code);

  if (!explanation) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800",
          className,
        )}
      >
        <p className="font-semibold">Ocurrió un error ({code}).</p>
        {technicalDetail ? (
          <pre className="mt-2 overflow-x-auto rounded bg-white/60 p-2 font-mono text-xs">
            {technicalDetail}
          </pre>
        ) : null}
      </div>
    );
  }

  const tutorial = explanation.tutorial
    ? getTutorial(explanation.tutorial.tutorialId)
    : undefined;

  return (
    <div
      role="alert"
      data-tutorial-id={`error-help-${code}`}
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{explanation.title}</h3>
          <p className="mt-1 text-sm">{explanation.whatHappened}</p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide">
            Posibles causas
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {explanation.likelyCauses.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide">
            Cómo corregirlo
          </p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
            {explanation.fixSteps.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ol>

          <p className="mt-3 rounded-lg bg-white/60 p-2 text-sm">
            <span className="font-semibold">Acción recomendada: </span>
            {explanation.recommendedAction}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tutorial && explanation.tutorial ? (
              <Button
                variant="primary"
                onClick={() =>
                  start(tutorial.id, explanation.tutorial!.stepIndex)
                }
              >
                <BookOpen className="h-4 w-4" />
                Abrir tutorial para corregirlo
              </Button>
            ) : null}
            {technicalDetail ? (
              <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    open && "rotate-180",
                  )}
                />
                Ver detalle técnico
              </Button>
            ) : null}
          </div>

          {open && technicalDetail ? (
            <pre className="mt-2 overflow-x-auto rounded bg-white/70 p-2 font-mono text-xs text-amber-950">
              {technicalDetail}
            </pre>
          ) : null}
          <p className="mt-2 font-mono text-[0.6875rem] text-amber-700">
            Código: {code}
            {supportId ? ` · Soporte: ${supportId}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
