import type { TestStep } from "@/features/systems/types";

/**
 * Intercambia el orden de dos pasos y devuelve el payload completo que espera
 * `POST /systems/test-suites/:suiteId/steps/reorder`.
 *
 * Se manda la lista entera (no solo los dos que se mueven) porque el backend
 * valida que no haya órdenes duplicados: un envío parcial chocaría con el orden
 * que ya tiene el paso vecino.
 *
 * Vive fuera del componente para poder probar el reordenamiento sin montar la
 * pantalla.
 */
export function buildReorderPayload(
  steps: TestStep[],
  step: TestStep,
  direction: -1 | 1,
): Array<{ stepId: string; stepOrder: number }> {
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const index = ordered.findIndex((item) => item.stepId === step.stepId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ordered.length) {
    return ordered.map((item) => ({
      stepId: item.stepId,
      stepOrder: item.stepOrder,
    }));
  }

  const swapped = [...ordered];
  [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
  // Se reindexa 1..n en vez de intercambiar los `stepOrder` originales: si la
  // suite venía con huecos (1, 5, 9), intercambiar los valores conserva el
  // hueco y el siguiente movimiento se vuelve impredecible.
  return swapped.map((item, position) => ({
    stepId: item.stepId,
    stepOrder: position + 1,
  }));
}
