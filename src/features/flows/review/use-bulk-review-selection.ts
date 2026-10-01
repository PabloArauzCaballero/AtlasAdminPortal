import { useCallback, useMemo, useState } from "react";
import { useReviewFlowMutation } from "./hooks";
import type { FlowReviewDecision, FlowReviewItem } from "./types";

/**
 * Selección múltiple para decidir varios flujos a la vez.
 *
 * Guarda el flujo entero (no sólo el id) porque la decisión exige su `depsHash` del momento en que se
 * marcó, el mismo que ya ve la tabla. Decide uno por uno, nunca en una sola petición: cada decisión
 * valida su propio `depsHash`, así que un 409 aislado (el código de ESE flujo cambió mientras se
 * revisaba la cola) no debe tumbar al resto del lote.
 */
export function useBulkReviewSelection(items: FlowReviewItem[]) {
  const decidir = useReviewFlowMutation();
  const [seleccion, setSeleccion] = useState<Map<string, FlowReviewItem>>(
    new Map(),
  );
  const [masivo, setMasivo] = useState<{
    enCurso: boolean;
    resultado: { ok: number; fallidos: FlowReviewItem[] } | null;
  }>({ enCurso: false, resultado: null });

  const seleccionEnPagina = useMemo(
    () => items.filter((f) => seleccion.has(f.id)).length,
    [items, seleccion],
  );

  const alternarUno = useCallback(
    (flujo: FlowReviewItem) =>
      setSeleccion((prev) => {
        const siguiente = new Map(prev);
        if (siguiente.has(flujo.id)) siguiente.delete(flujo.id);
        else siguiente.set(flujo.id, flujo);
        return siguiente;
      }),
    [],
  );

  const alternarPagina = useCallback(
    () =>
      setSeleccion((prev) => {
        const siguiente = new Map(prev);
        const todosMarcados =
          items.length > 0 && items.every((f) => siguiente.has(f.id));
        for (const flujo of items) {
          if (todosMarcados) siguiente.delete(flujo.id);
          else siguiente.set(flujo.id, flujo);
        }
        return siguiente;
      }),
    [items],
  );

  const decidirMasivo = useCallback(
    async (reviewStatus: FlowReviewDecision["reviewStatus"]) => {
      const flujos = [...seleccion.values()];
      if (!flujos.length) return;
      setMasivo({ enCurso: true, resultado: null });
      const fallidos: FlowReviewItem[] = [];
      let ok = 0;
      for (const flujo of flujos) {
        try {
          await decidir.mutateAsync({
            flowId: flujo.id,
            body: { reviewStatus, depsHash: flujo.depsHash },
          });
          ok += 1;
        } catch {
          fallidos.push(flujo);
        }
      }
      setMasivo({ enCurso: false, resultado: { ok, fallidos } });
      setSeleccion(new Map(fallidos.map((f) => [f.id, f])));
    },
    [seleccion, decidir],
  );

  return {
    seleccion,
    seleccionEnPagina,
    masivo,
    alternarUno,
    alternarPagina,
    decidirMasivo,
    limpiarSeleccion: () => setSeleccion(new Map()),
  };
}
