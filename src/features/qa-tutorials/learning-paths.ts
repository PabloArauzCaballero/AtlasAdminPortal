import type { TutorialDefinition } from "./types";
import { getTutorial } from "./catalog";

/** Recorridos sugeridos: secuencias de tutoriales con un hilo conductor. */
export type LearningPath = Readonly<{
  id: string;
  title: string;
  summary: string;
  tutorialIds: readonly string[];
}>;

export const learningPaths: readonly LearningPath[] = [
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    summary:
      "De cero a probar tu primera operación con datos generados y medir cuánta carga aguanta.",
    tutorialIds: ["qa-lab-overview", "qa-lab-functional", "qa-lab-stress"],
  },
  {
    id: "gestion-suites",
    title: "Gestión de suites",
    summary: "Crear suites, añadir casos, ejecutarlas y leer sus estados.",
    tutorialIds: ["qa-suites-list", "qa-suite-detail", "qa-runs-interpret"],
  },
  {
    id: "pruebas-api",
    title: "Pruebas de API",
    summary: "Probar operaciones una a una y encadenarlas en un recorrido.",
    tutorialIds: ["qa-lab-functional", "qa-lab-journey"],
  },
  {
    id: "recorridos-y-dependencias",
    title: "Recorridos y dependencias",
    summary:
      "Diseñar un recorrido, leer su árbol de decisión y saber qué se cae si un paso falla.",
    tutorialIds: [
      "qa-lab-journey",
      "qa-lab-decision-tree",
      "qa-runs-interpret",
    ],
  },
  {
    id: "rendimiento",
    title: "Rendimiento y carga",
    summary:
      "Medir carga en el Lab y guardar perfiles de carga reutilizables (hoy sólo se encolan).",
    tutorialIds: ["qa-lab-stress", "qa-stress-profile"],
  },
  {
    id: "analisis-errores",
    title: "Análisis de errores",
    summary:
      "Leer una ejecución de suite y el resultado de una prueba del Lab para encontrar la causa.",
    tutorialIds: ["qa-runs-interpret", "qa-lab-functional"],
  },
];

/** Resuelve los tutoriales de un path (ignora ids que ya no existan). */
export function pathTutorials(path: LearningPath): TutorialDefinition[] {
  return path.tutorialIds
    .map((id) => getTutorial(id))
    .filter((t): t is TutorialDefinition => Boolean(t));
}
