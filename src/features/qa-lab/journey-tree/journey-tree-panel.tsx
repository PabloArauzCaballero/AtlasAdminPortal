"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useEndpointsByIds } from "@/features/systems/hooks";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";
import { parseSteps } from "../journey-form";
import { useJourneyWorkspace } from "../journey-workspace";
import { TreeControls, TreeLegend, TreeSummary } from "./journey-tree-controls";
import { JourneyTreeDiagram } from "./journey-tree-diagram";
import { JourneyTreeNodeDetail } from "./journey-tree-node-detail";
import { buildJourneyTree, simulateJourney } from "./journey-tree-model";

/** Sin límite: se ven todos los pasos evaluados a la vez. */
const SHOW_ALL = Number.MAX_SAFE_INTEGER;
const PLAY_STEP_MS = 950;

/**
 * Pestaña «Árbol de decisión»: la misma secuencia de la pestaña Journey, pero
 * dibujada como lo que realmente es — una cadena de decisiones. En cada paso
 * hay una bifurcación por el estado HTTP y unos datos que viajan al siguiente;
 * marcar un fallo enseña el efecto dominó sin tener que provocarlo de verdad.
 */
export function JourneyDecisionTreePanel() {
  const { stepsText, lastRun } = useJourneyWorkspace();
  const parsed = useMemo(() => parseSteps(stepsText), [stepsText]);
  const steps = useMemo(() => (parsed.ok ? parsed.value : []), [parsed]);
  const endpointIds = useMemo(
    () => steps.map((step) => step.endpointId),
    [steps],
  );
  const endpoints = useEndpointsByIds(endpointIds);
  const tree = useMemo(
    () => buildJourneyTree(steps, endpoints.byId, lastRun),
    [steps, endpoints.byId, lastRun],
  );

  const [selected, setSelected] = useState<number | null>(0);
  const [failedKeys, setFailedKeys] = useState<readonly string[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [cursor, setCursor] = useState(SHOW_ALL);
  const [playing, setPlaying] = useState(false);

  // Reproducción: un paso cada vez, como si el runner los fuera ejecutando.
  useEffect(() => {
    if (!playing) return;
    if (cursor >= tree.nodes.length - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setCursor(cursor + 1), PLAY_STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, cursor, tree.nodes.length]);

  const simulation = useMemo(
    () =>
      simulateJourney(tree, {
        failedKeys: new Set(failedKeys),
        cursor,
        dryRun,
      }),
    [tree, failedKeys, cursor, dryRun],
  );

  if (!parsed.ok) {
    return (
      <Panel>
        <ErrorState
          title="Todavía no hay recorrido que dibujar"
          description={`La secuencia de pasos no es JSON válido (${parsed.error}). Corrígela en la pestaña «Journey (encadenado)» y el árbol se dibuja solo.`}
        />
      </Panel>
    );
  }

  const selectedIndex =
    selected !== null && selected < tree.nodes.length ? selected : null;

  function toggleFailure(key: string) {
    setFailedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
    setCursor(SHOW_ALL);
  }

  return (
    <Panel>
      <TreeSummary tree={tree} simulation={simulation} />

      <div data-tutorial-id="qa-lab-tree-controls">
        <TreeControls
          dryRun={dryRun}
          playing={playing}
          hasRun={Boolean(lastRun)}
          failedCount={failedKeys.length}
          onDryRunChange={setDryRun}
          onTogglePlay={() => {
            if (playing) {
              setPlaying(false);
              return;
            }
            setCursor(0);
            setPlaying(true);
          }}
          onShowAll={() => {
            setPlaying(false);
            setCursor(SHOW_ALL);
          }}
          onUseLastRun={() => {
            if (!lastRun) return;
            setDryRun(false);
            setFailedKeys(
              lastRun.steps.filter((step) => !step.passed).map((s) => s.key),
            );
            setCursor(SHOW_ALL);
          }}
          onClear={() => setFailedKeys([])}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          data-tutorial-id="qa-lab-tree-diagram"
          className="atlas-scrollbar overflow-x-auto rounded-2xl border border-atlas-border bg-white p-3"
        >
          <JourneyTreeDiagram
            tree={tree}
            simulation={simulation}
            selected={selectedIndex}
            cursor={cursor}
            playing={playing}
            onSelect={(index) =>
              setSelected((current) => (current === index ? null : index))
            }
          />
        </div>
        <div className="space-y-3">
          <div data-tutorial-id="qa-lab-tree-detail">
            {selectedIndex === null ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-xs leading-5 text-atlas-muted">
                Pulsa cualquier paso del árbol para ver de dónde le llegan los
                datos, qué deja para los siguientes y qué se rompería si
                respondiera mal.
              </p>
            ) : (
              <JourneyTreeNodeDetail
                tree={tree}
                index={selectedIndex}
                state={simulation.states[selectedIndex] ?? "pending"}
                simulatedFailure={failedKeys.includes(
                  tree.nodes[selectedIndex].key,
                )}
                onToggleFailure={() =>
                  toggleFailure(tree.nodes[selectedIndex].key)
                }
              />
            )}
          </div>
          <div
            data-tutorial-id="qa-lab-tree-legend"
            className="rounded-2xl border border-atlas-border bg-white p-3"
          >
            <p className="mb-2 text-xs font-semibold text-atlas-text">
              Cómo leer el árbol
            </p>
            <TreeLegend />
          </div>
        </div>
      </div>

      <Notes
        dryRun={dryRun}
        loading={endpoints.isLoading}
        unresolved={tree.nodes.filter((node) => !node.resolved).length}
        orphans={tree.nodes.flatMap((node) =>
          node.orphanVars.map((name) => `${name} (paso ${node.index + 1})`),
        )}
      />
    </Panel>
  );
}

function Panel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-tutorial-id="qa-lab-tree-panel">
      <Card>
        <CardHeader>
          <SectionHeader
            title="Árbol de decisión del recorrido"
            description="El mismo journey de la pestaña anterior, visto como una cadena de decisiones: en cada paso, ¿responde lo esperado? Sí baja al siguiente; no dispara una consecuencia. Las curvas de la izquierda son los datos que un paso deja para otro."
            className="mb-0"
          />
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}

function Notes({
  dryRun,
  loading,
  unresolved,
  orphans,
}: Readonly<{
  dryRun: boolean;
  loading: boolean;
  unresolved: number;
  orphans: readonly string[];
}>) {
  const notes: string[] = [];
  if (dryRun) {
    notes.push(
      "En dry-run el runner no extrae variables: por eso los pasos que dependen de un dato aparecen en riesgo. Cambia a «Ejecución real» para ver el encadenado tal como ocurriría.",
    );
  }
  if (loading) {
    notes.push(
      "Resolviendo los endpoints contra el catálogo: método y ruta aparecerán en cuanto respondan.",
    );
  } else if (unresolved > 0) {
    notes.push(
      unresolved === 1
        ? "Un paso apunta a un endpointId que no existe en el catálogo: el runner lo marcaría como omitido."
        : `${unresolved} pasos apuntan a un endpointId que no existe en el catálogo: el runner los marcaría como omitidos.`,
    );
  }
  if (orphans.length > 0) {
    notes.push(
      `Variables que nadie extrae y saldrán literales en la petición: ${orphans.join(", ")}.`,
    );
  }
  if (notes.length === 0) return null;

  return (
    <ul
      data-tutorial-id="qa-lab-tree-notes"
      className="space-y-1.5 rounded-2xl border border-atlas-border bg-atlas-soft p-3"
    >
      {notes.map((note) => (
        <li
          key={note}
          className="flex items-start gap-2 text-xs leading-5 text-atlas-text"
        >
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-atlas-accent"
            aria-hidden
          />
          {note}
        </li>
      ))}
    </ul>
  );
}
