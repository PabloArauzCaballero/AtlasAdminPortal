import { primaryModuleExplanations } from "./view-explanations-primary";
import { secondaryModuleExplanations } from "./view-explanations-secondary";
import type {
  ModuleExplanation,
  ViewExplanation,
} from "./view-explanations-types";

export type { ModuleExplanation, ViewExplanation };

export const moduleExplanations: ModuleExplanation[] = [
  ...primaryModuleExplanations,
  ...secondaryModuleExplanations,
];

export type ResolvedExplanation = {
  module: ModuleExplanation;
  /** Vista específica si hay match; null cuando solo aplica la explicación de módulo. */
  view: ViewExplanation | null;
};

/**
 * Resuelve la explicación de módulo y vista para un pathname. Gana el prefijo
 * más largo tanto a nivel módulo como a nivel vista, así `/internal/systems/tools/health`
 * matchea la vista de salud y no la de herramientas.
 */
export function resolveExplanation(
  pathname: string,
): ResolvedExplanation | null {
  let bestModule: ModuleExplanation | null = null;
  let bestModulePrefix = "";
  for (const moduleEntry of moduleExplanations) {
    for (const prefix of moduleEntry.prefixes) {
      if (
        pathname.startsWith(prefix) &&
        prefix.length > bestModulePrefix.length
      ) {
        bestModule = moduleEntry;
        bestModulePrefix = prefix;
      }
    }
  }
  if (!bestModule) return null;

  let bestView: ViewExplanation | null = null;
  let bestViewPrefix = "";
  for (const [prefix, view] of Object.entries(bestModule.views)) {
    if (pathname.startsWith(prefix) && prefix.length > bestViewPrefix.length) {
      bestView = view;
      bestViewPrefix = prefix;
    }
  }
  return { module: bestModule, view: bestView };
}
