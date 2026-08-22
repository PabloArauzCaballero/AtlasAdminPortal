import type { TutorialDefinition } from "../types";
import { qaLabTutorials } from "./qa-lab-tutorials";
import { qaConsoleTutorials } from "./qa-console-tutorials";
import { qaStressTutorials } from "./qa-stress-tutorials";

/** Catálogo centralizado. El motor NUNCA hardcodea recorridos: lee de aquí. */
export const tutorialCatalog: readonly TutorialDefinition[] = [
  ...qaLabTutorials,
  ...qaConsoleTutorials,
  ...qaStressTutorials,
];

const byId = new Map(tutorialCatalog.map((t) => [t.id, t]));

export function getTutorial(id: string): TutorialDefinition | undefined {
  return byId.get(id);
}

export function getTutorialsByModule(module: string): TutorialDefinition[] {
  return tutorialCatalog.filter((t) => t.module === module);
}

export function getTutorialsByTab(
  module: string,
  tab: string,
): TutorialDefinition[] {
  return tutorialCatalog.filter((t) => t.module === module && t.tab === tab);
}

/** Recorridos que ofrecen un objetivo de negocio para el launcher "¿Qué quieres hacer?". */
export function getGoalTutorials(): TutorialDefinition[] {
  return tutorialCatalog.filter((t) => Boolean(t.goal));
}

export type ErrorTutorialLink = Readonly<{
  tutorialId: string;
  stepIndex: number;
}>;

/**
 * Índice inverso códigoDeError -> (tutorial, paso). Construido a partir de
 * `relatedErrorCodes` en los pasos: abrir un error lleva al paso exacto que lo
 * explica, sin duplicar información.
 */
const errorIndex = buildErrorIndex(tutorialCatalog);

function buildErrorIndex(
  catalog: readonly TutorialDefinition[],
): Map<string, ErrorTutorialLink> {
  const index = new Map<string, ErrorTutorialLink>();
  for (const tutorial of catalog) {
    tutorial.steps.forEach((step, stepIndex) => {
      for (const code of step.relatedErrorCodes ?? []) {
        if (!index.has(code)) {
          index.set(code, { tutorialId: tutorial.id, stepIndex });
        }
      }
    });
  }
  return index;
}

export function getTutorialForError(
  errorCode: string,
): ErrorTutorialLink | undefined {
  return errorIndex.get(errorCode);
}

/** Todos los códigos de error con ayuda contextual (para tests y catálogo). */
export function knownErrorCodes(): string[] {
  return [...errorIndex.keys()];
}
