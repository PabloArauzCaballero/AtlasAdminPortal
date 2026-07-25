/**
 * Modelo de datos del sistema de tutoriales interactivos de QA LAB.
 *
 * Todo es data-driven: los recorridos se declaran como datos (ver `catalog/`)
 * y el motor (`tutorial-engine.ts`) más el runtime (`use-tutorial-runtime.ts`)
 * los ejecutan. Añadir una herramienta nueva = añadir una definición, sin
 * tocar el motor.
 */

export type TutorialLevel = "basic" | "intermediate" | "advanced";

/**
 * Cómo avanza un paso. El tutorial NO avanza solo hasta que ocurre la acción
 * real (salvo `none`, que avanza con el botón Siguiente, o si el usuario omite).
 */
export type TutorialActionType =
  | "none" // avanza con el botón "Siguiente"
  | "click" // espera clic sobre el target
  | "element-appears" // espera a que aparezca un elemento (async / modal / fila)
  | "input-filled" // espera a que el target tenga valor
  | "route-change"; // espera navegación a `route`

export type TutorialAction = Readonly<{
  type: TutorialActionType;
  /** data-tutorial-id del elemento observado (por defecto, el target del paso). */
  targetId?: string;
  /** Ruta esperada para `route-change` (prefijo, p. ej. "/internal/qa/suites"). */
  route?: string;
}>;

export type TutorialValidation = Readonly<{
  /** data-tutorial-id que debe existir para dar el paso por válido. */
  requiresElement?: string;
  /** Mensaje si la validación aún no se cumple. */
  hint?: string;
}>;

export type TutorialStep = Readonly<{
  id: string;
  /** data-tutorial-id del elemento a resaltar. Sin target = paso "flotante" centrado. */
  target?: string;
  title: string;
  /** Texto orientado a negocio; admite saltos de línea (\n\n para párrafos). */
  content: string;
  /** Ejemplo práctico opcional mostrado en un bloque destacado. */
  example?: string;
  /** Demo visual interactiva a incrustar en la tarjeta (clave del registro de demos). */
  demo?: "latency";
  position?: "top" | "right" | "bottom" | "left" | "auto";
  requiredAction?: TutorialAction;
  /** Cambia de ruta automáticamente al entrar al paso. */
  nextRoute?: string;
  /** Espera (con MutationObserver) a que el target se renderice antes de resaltar. */
  waitForElement?: boolean;
  optional?: boolean;
  validation?: TutorialValidation;
  /** Códigos de error del backend/runner que enlazan a este paso. */
  relatedErrorCodes?: readonly string[];
}>;

export type TutorialDefinition = Readonly<{
  id: string;
  module: string;
  tab?: string;
  tool: string;
  title: string;
  description: string;
  level: TutorialLevel;
  version: number;
  /** Ruta donde arranca el recorrido; el launcher navega aquí si hace falta. */
  route: string;
  /** Duración aproximada (min) — informativa, nunca bloquea. */
  estimatedMinutes?: number;
  /** Objetivo de negocio para el launcher "¿Qué quieres hacer?". */
  goal?: string;
  steps: readonly TutorialStep[];
}>;

export type TutorialStatus =
  "not-started" | "in-progress" | "completed" | "skipped" | "needs-update";

export type TutorialProgress = Readonly<{
  tutorialId: string;
  version: number;
  status: TutorialStatus;
  lastStepIndex: number;
  percent: number;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  timesStarted: number;
  lastActivityAt?: string;
}>;

/** Mapa userId -> (tutorialId -> progreso). Forma del store de persistencia. */
export type TutorialProgressMap = Record<string, TutorialProgress>;
