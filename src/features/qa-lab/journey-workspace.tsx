"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { JOURNEY_EXAMPLE_SPEC, type QaJourneyRunResult } from "./journey-types";

/**
 * Estado compartido del recorrido entre las pestañas del Lab.
 *
 * El editor de pasos y el árbol de decisión son dos vistas de LO MISMO: si cada
 * una guardara su propio JSON, cambiar de pestaña mostraría dos recorridos
 * distintos y el árbol dejaría de explicar el journey que realmente se ejecuta.
 * Fuera del provider (tests, uso aislado del panel) cada consumidor cae a su
 * propio estado local, así que ningún componente exige contexto para funcionar.
 */

export const DEFAULT_STEPS_TEXT = JSON.stringify(JOURNEY_EXAMPLE_SPEC, null, 2);

export type JourneyWorkspace = Readonly<{
  stepsText: string;
  setStepsText: (text: string) => void;
  lastRun: QaJourneyRunResult | null;
  setLastRun: (run: QaJourneyRunResult | null) => void;
}>;

const JourneyWorkspaceContext = createContext<JourneyWorkspace | null>(null);

export function JourneyWorkspaceProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const value = useWorkspaceState();
  return (
    <JourneyWorkspaceContext.Provider value={value}>
      {children}
    </JourneyWorkspaceContext.Provider>
  );
}

export function useJourneyWorkspace(): JourneyWorkspace {
  const shared = useContext(JourneyWorkspaceContext);
  const local = useWorkspaceState();
  return shared ?? local;
}

function useWorkspaceState(): JourneyWorkspace {
  const [stepsText, setStepsText] = useState(DEFAULT_STEPS_TEXT);
  const [lastRun, setLastRun] = useState<QaJourneyRunResult | null>(null);
  return useMemo(
    () => ({ stepsText, setStepsText, lastRun, setLastRun }),
    [stepsText, lastRun],
  );
}
