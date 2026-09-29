import { creditModuleExplanations } from "./view-explanations-credit";
import { operationsModuleExplanation } from "./view-explanations-operations";
import { primaryModuleExplanations } from "./view-explanations-primary";
import { processesModuleExplanations } from "./view-explanations-processes";
import { secondaryModuleExplanations } from "./view-explanations-secondary";
import {
  homeModuleExplanation,
  searchModuleExplanation,
  systemsOpsModuleExplanation,
} from "./view-explanations-systems-ops";
import type {
  ModuleExplanation,
  ViewExplanation,
} from "./view-explanations-types";

export type { ModuleExplanation, ViewExplanation };

export const moduleExplanations: ModuleExplanation[] = [
  homeModuleExplanation,
  systemsOpsModuleExplanation,
  ...primaryModuleExplanations,
  operationsModuleExplanation,
  ...secondaryModuleExplanations,
  searchModuleExplanation,
  ...processesModuleExplanations,
  ...creditModuleExplanations,
];

export type ResolvedExplanation = {
  module: ModuleExplanation;
  /** Vista específica si hay match; null cuando solo aplica la explicación de módulo. */
  view: ViewExplanation | null;
};

/**
 * ¿`pathname` cae bajo `prefix`? Un prefijo sin corchetes se compara con `startsWith`, como
 * siempre. Uno con `[param]` se compara por segmentos y el corchete vale cualquier segmento: es
 * lo que permite dar texto propio a `/internal/procesos/[code]`, cuyo código cambia.
 */
export function matchesPrefix(pathname: string, prefix: string): boolean {
  if (!prefix.includes("[")) return pathname.startsWith(prefix);
  const path = pathname.split("/");
  const pattern = prefix.split("/");
  if (path.length < pattern.length) return false;
  return pattern.every((segment, index) =>
    /^\[[^\]]+\]$/.test(segment)
      ? Boolean(path[index])
      : segment === path[index],
  );
}

/**
 * Resuelve la explicación de módulo y vista para un pathname. Gana el prefijo
 * más largo tanto a nivel módulo como a nivel vista, así `/internal/flows/review`
 * matchea la vista de revisión y no la del mapa de rutas.
 */
export function resolveExplanation(
  pathname: string,
): ResolvedExplanation | null {
  let bestModule: ModuleExplanation | null = null;
  let bestModulePrefix = "";
  for (const moduleEntry of moduleExplanations) {
    for (const prefix of moduleEntry.prefixes) {
      const matches = moduleEntry.exact
        ? pathname === prefix
        : pathname.startsWith(prefix);
      if (matches && prefix.length > bestModulePrefix.length) {
        bestModule = moduleEntry;
        bestModulePrefix = prefix;
      }
    }
  }
  if (!bestModule) return null;

  let bestView: ViewExplanation | null = null;
  let bestViewPrefix = "";
  for (const [prefix, view] of Object.entries(bestModule.views)) {
    if (
      matchesPrefix(pathname, prefix) &&
      prefix.length > bestViewPrefix.length
    ) {
      bestView = view;
      bestViewPrefix = prefix;
    }
  }
  return { module: bestModule, view: bestView };
}
