"use client";

import { HelpCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { getTutorial } from "./catalog";
import { statusVisual } from "./status-visuals";
import { useTutorial } from "./tutorial-provider";

/**
 * Acceso visible y consistente al tutorial de una sección. Muestra el estado
 * (disponible/en progreso/completado) y arranca —o retoma— el recorrido: el
 * provider decide el paso exacto a partir del progreso guardado. Con teclado, foco y aria-label; variante compacta para barras
 * de acciones apretadas.
 */
export function TutorialLaunchButton({
  tutorialId,
  variant = "full",
  className,
}: Readonly<{
  tutorialId: string;
  variant?: "full" | "compact";
  className?: string;
}>) {
  const { start, statusFor } = useTutorial();
  const definition = getTutorial(tutorialId);
  if (!definition) return null;

  const status = statusFor(tutorialId);
  const visual = statusVisual(status);

  const tooltip = `${visual.actionLabel} · ${definition.title}`;

  if (variant === "compact") {
    return (
      <button
        type="button"
        data-tutorial-id={`launch-${tutorialId}`}
        onClick={() => start(tutorialId)}
        aria-label={tooltip}
        title={tooltip}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-atlas-border bg-white text-atlas-accent shadow-subtle transition-colors hover:bg-atlas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40",
          className,
        )}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    );
  }

  const { Icon } = visual;
  return (
    <button
      type="button"
      data-tutorial-id={`launch-${tutorialId}`}
      onClick={() => start(tutorialId)}
      aria-label={tooltip}
      title="Iniciar tutorial interactivo de esta sección"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40",
        visual.chipClass,
        "hover:brightness-[0.98]",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>Tutorial</span>
      <span className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">
        {visual.label}
      </span>
    </button>
  );
}
