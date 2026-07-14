import type { QaJourneyStepSpec } from "./journey-types";

export type ParseStepsResult =
  { ok: true; value: QaJourneyStepSpec[] } | { ok: false; error: string };

/**
 * Validación mínima compartida entre el editor JSON/archivo y la tabla de
 * secuencia: ambos leen y escriben el mismo texto JSON como fuente única de
 * verdad, así que ambos necesitan la misma regla de qué cuenta como "paso
 * válido" (key + endpointId).
 */
export function parseSteps(text: string): ParseStepsResult {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        ok: false as const,
        error: "Debe ser un array con al menos un paso.",
      };
    }
    for (const [index, item] of parsed.entries()) {
      if (!item || typeof item !== "object") {
        return {
          ok: false as const,
          error: `Paso ${index + 1}: debe ser un objeto.`,
        };
      }
      const step = item as Record<string, unknown>;
      if (typeof step.key !== "string" || !step.key) {
        return { ok: false as const, error: `Paso ${index + 1}: falta "key".` };
      }
      if (typeof step.endpointId !== "string" || !step.endpointId) {
        return {
          ok: false as const,
          error: `Paso ${index + 1} (${step.key}): falta "endpointId".`,
        };
      }
    }
    return { ok: true as const, value: parsed as QaJourneyStepSpec[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON inválido";
    return { ok: false as const, error: message };
  }
}

export function emptyStep(index: number): QaJourneyStepSpec {
  return {
    key: `paso_${index}`,
    name: "",
    endpointId: "",
    expectedStatusCodes: [200, 201],
  };
}
