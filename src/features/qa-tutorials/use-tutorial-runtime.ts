"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { selectorFor } from "./dom-utils";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";

/**
 * Efectos reactivos del recorrido: navega a la ruta del paso al entrar y, si el
 * paso exige una acción real (clic, aparición de un elemento, input, cambio de
 * ruta), espera a que ocurra para avanzar. No toca la geometría: eso es del
 * overlay.
 */
export function useTutorialRuntime({
  step,
  phase,
  onSatisfied,
}: Readonly<{
  step: TutorialStep | undefined;
  phase: EnginePhase;
  onSatisfied: () => void;
}>) {
  const router = useRouter();
  const pathname = usePathname();

  // Cambio de pestaña/página automático cuando el paso lo pide.
  useEffect(() => {
    if (step?.nextRoute && pathname !== step.nextRoute) {
      router.push(step.nextRoute);
    }
    // Sólo al entrar al paso: no queremos re-navegar en cada cambio de pathname.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  // Gate por acción real del usuario.
  useEffect(() => {
    const action = step?.requiredAction;
    if (phase !== "awaiting-action" || !action) return;
    const targetId = action.targetId ?? step?.target;

    if (action.type === "click") {
      if (!targetId) return;
      const handler = (event: Event) => {
        const node = event.target as Element | null;
        if (node?.closest(selectorFor(targetId))) onSatisfied();
      };
      document.addEventListener("click", handler, true);
      return () => document.removeEventListener("click", handler, true);
    }

    if (action.type === "input-filled") {
      if (!targetId) return;
      const handler = (event: Event) => {
        const node = event.target as HTMLInputElement | null;
        if (
          node?.closest(selectorFor(targetId)) &&
          node.value?.trim().length > 0
        ) {
          onSatisfied();
        }
      };
      document.addEventListener("input", handler, true);
      return () => document.removeEventListener("input", handler, true);
    }

    if (action.type === "element-appears") {
      if (!targetId) return;
      const selector = selectorFor(targetId);
      if (document.querySelector(selector)) {
        onSatisfied();
        return;
      }
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          onSatisfied();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    if (action.type === "route-change") {
      if (action.route && pathname.startsWith(action.route)) onSatisfied();
    }
    return;
  }, [
    step?.id,
    phase,
    step?.requiredAction,
    step?.target,
    pathname,
    onSatisfied,
  ]);
}
