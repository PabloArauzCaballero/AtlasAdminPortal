"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { matchesLocation, selectorFor } from "./dom-utils";
import type { EnginePhase } from "./tutorial-engine";
import type { TutorialStep } from "./types";

/** Ubicación actual leída del navegador (ruta + query), sin `useSearchParams`. */
function currentLocation(pathname: string) {
  return {
    pathname,
    search: typeof window === "undefined" ? "" : window.location.search,
  };
}

/**
 * Efectos reactivos del recorrido: navega a la ruta/pestaña del paso al entrar
 * y, si el paso exige una acción real (clic, aparición de un elemento, input,
 * cambio de ruta), espera a que ocurra para avanzar.
 *
 * Regla para no «saltar solo»: si al ENTRAR al paso la acción ya está cumplida
 * (el elemento ya existe, ya estamos en la ruta), no se avanza: se avisa con
 * `onAlreadyDone` y el usuario pasa con Siguiente tras leer. Sólo avanza
 * automáticamente lo que ocurre DESPUÉS de entrar al paso.
 */
export function useTutorialRuntime({
  step,
  phase,
  onSatisfied,
  onAlreadyDone,
}: Readonly<{
  step: TutorialStep | undefined;
  phase: EnginePhase;
  onSatisfied: () => void;
  onAlreadyDone: () => void;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  // Qué paso ya hizo su comprobación inicial: evita repetirla cuando el efecto
  // se re-suscribe por un cambio de callbacks o de ruta.
  const checkedStepRef = useRef<TutorialStep | null>(null);

  // Cada entrada a un paso (aunque sea el mismo, tras Atrás/Siguiente) vuelve
  // a comprobar «¿ya estaba hecho?». Declarado antes del gate para correr antes.
  useEffect(() => {
    checkedStepRef.current = null;
  }, [step]);

  // Cambio de pestaña/página automático cuando el paso lo pide.
  useEffect(() => {
    if (!step?.nextRoute) return;
    if (!matchesLocation(currentLocation(pathname), step.nextRoute)) {
      router.push(step.nextRoute);
    }
    // Sólo al entrar al paso: no queremos re-navegar en cada cambio de pathname.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Gate por acción real del usuario.
  useEffect(() => {
    const action = step?.requiredAction;
    if (!step || phase !== "awaiting-action" || !action) return;
    const targetId = action.targetId ?? step.target;
    const firstCheck = checkedStepRef.current !== step;
    checkedStepRef.current = step;

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
        if (firstCheck) onAlreadyDone();
        else onSatisfied();
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

    if (action.type === "route-change" && action.route) {
      if (pathname.startsWith(action.route)) {
        if (firstCheck) onAlreadyDone();
        else onSatisfied();
      }
    }
    return;
  }, [step, phase, pathname, onSatisfied, onAlreadyDone]);
}
