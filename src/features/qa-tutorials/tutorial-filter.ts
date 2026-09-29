import type { Option } from "@/shared/lib/options";
import { LEVEL_LABEL } from "./tutorial-columns";
import { statusVisual } from "./status-visuals";
import type { TutorialDefinition, TutorialStatus } from "./types";

export const LEVEL_OPTIONS: Option[] = (
  [
    ["basic", "Para empezar desde cero."],
    ["intermediate", "Supone que ya usaste la pantalla."],
    ["advanced", "Casos más finos: dependencias, carga, errores."],
  ] as const
).map(([value, description]) => ({
  value,
  label: LEVEL_LABEL[value],
  description,
}));

const STATUSES: ReadonlyArray<[TutorialStatus, string]> = [
  ["not-started", "Todavía no lo empezaste."],
  ["in-progress", "Lo empezaste y quedó a medias."],
  ["completed", "Lo terminaste; puedes repetirlo."],
  ["skipped", "Lo cerraste sin terminar."],
  ["needs-update", "El tutorial cambió desde la última vez."],
];

export const STATUS_OPTIONS: Option[] = STATUSES.map(
  ([value, description]) => ({
    value,
    label: statusVisual(value).label,
    description,
  }),
);

/** El catálogo de tutoriales vive en el código del portal: se filtra entero, en el navegador. */
export function filterTutorials(
  catalog: readonly TutorialDefinition[],
  filters: { q: string; module: string; level: string; status: string },
  statusFor: (tutorialId: string) => TutorialStatus,
): TutorialDefinition[] {
  const needle = filters.q.trim().toLowerCase();
  return catalog.filter((tutorial) => {
    if (filters.module && tutorial.module !== filters.module) return false;
    if (filters.level && tutorial.level !== filters.level) return false;
    if (filters.status && statusFor(tutorial.id) !== filters.status)
      return false;
    if (!needle) return true;
    return `${tutorial.title} ${tutorial.description} ${tutorial.tool} ${tutorial.goal ?? ""}`
      .toLowerCase()
      .includes(needle);
  });
}
