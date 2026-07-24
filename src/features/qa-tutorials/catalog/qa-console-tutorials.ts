import type { TutorialDefinition } from "../types";

/**
 * Recorridos de la QA Console: suites, pasos/casos y runs (ejecuciones).
 * Rutas: `/internal/qa/suites`, `/internal/qa/suites/[id]`, `/internal/qa/runs`.
 */

const suitesList: TutorialDefinition = {
  id: "qa-suites-list",
  module: "Suites",
  tab: "Lista",
  tool: "Suites de prueba",
  title: "Crear y organizar una suite",
  description:
    "Agrupa casos relacionados en una suite para ejecutarlos juntos y con confianza.",
  level: "basic",
  version: 1,
  route: "/internal/qa/suites",
  estimatedMinutes: 5,
  goal: "Crear mi primera suite",
  steps: [
    {
      id: "what",
      title: "¿Qué es una suite?",
      content:
        "Una suite de pruebas reúne varios casos relacionados para ejecutarlos juntos.\n\nPor ejemplo, una suite «Inicio de sesión» puede comprobar: acceso con credenciales correctas, rechazo de contraseña incorrecta, recuperación de contraseña y bloqueo tras varios intentos.\n\nAsí verificas que TODA una funcionalidad sigue trabajando antes de publicarla.",
    },
    {
      id: "list",
      target: "qa-suites-table",
      title: "Tus suites registradas",
      content:
        "Esta lista muestra las suites guardadas en el backend, con su módulo, tipo y si son seguras para producción. Cada código enlaza al detalle de la suite.",
      position: "top",
      waitForElement: true,
    },
    {
      id: "create",
      target: "qa-suites-new",
      title: "Crea una suite nueva",
      content:
        "Pulsa «Nueva suite» para abrir el formulario. Necesitas: un nombre claro, el módulo al que pertenece y el tipo de prueba (funcional, regresión, humo…).",
      position: "bottom",
      requiredAction: { type: "element-appears", targetId: "qa-suite-form" },
      optional: true,
    },
    {
      id: "form",
      target: "qa-suite-form",
      title: "Rellena los datos",
      content:
        "El tipo de suite, el módulo y los ambientes salen de catálogos del backend (no texto libre), para que no haya valores inventados. Marca «segura para producción» sólo si la suite no altera datos reales.",
      position: "left",
      waitForElement: true,
    },
    {
      id: "next",
      title: "¿Y después?",
      content:
        "Al guardar entras al detalle de la suite, donde añades los pasos (casos) y la ejecutas. Continúa con el tutorial «Detalle de suite».",
    },
  ],
};

const suiteDetail: TutorialDefinition = {
  id: "qa-suite-detail",
  module: "Suites",
  tab: "Detalle",
  tool: "Pasos y ejecución",
  title: "Añadir casos y ejecutar la suite",
  description:
    "Define los pasos de la suite, revisa su configuración y ejecútala contra un ambiente.",
  level: "intermediate",
  version: 1,
  route: "/internal/qa/suites",
  estimatedMinutes: 6,
  goal: "Ejecutar una suite y sus casos",
  steps: [
    {
      id: "tabs",
      title: "Las cuatro pestañas del detalle",
      content:
        "Resumen (qué es la suite) · Pasos (los casos que ejecuta) · Config (variables y ambiente) · Ejecución (lanzarla y ver el resultado).\n\nEl orden es también el flujo de trabajo: primero defines, luego configuras, luego ejecutas.",
    },
    {
      id: "steps",
      title: "Pasos = casos de prueba",
      content:
        "Cada paso es un caso: una acción contra el backend con un resultado esperado. Puedes añadir, reordenar y quitar pasos. El orden importa: se ejecutan de arriba a abajo.",
      example:
        "Paso 1: crear cliente (espera 201). Paso 2: consultar el cliente creado (espera 200 con sus datos).",
    },
    {
      id: "config",
      title: "Config: ambiente y variables",
      content:
        "Elige el ambiente destino (dónde se ejecuta) y define variables compartidas (por ejemplo, un id o un token) que todos los pasos pueden reutilizar. El ambiente sale de catálogo: nunca escribes una URL a mano.",
    },
    {
      id: "run",
      title: "Ejecutar y leer estados",
      content:
        "Al ejecutar, cada paso termina en un estado. Aprende a leerlos en el tutorial «Interpretar una ejecución»: Aprobado, Fallido, Bloqueado, Omitido y Error de infraestructura no significan lo mismo ni piden la misma acción.",
    },
  ],
};

const runsInterpret: TutorialDefinition = {
  id: "qa-runs-interpret",
  module: "Runs",
  tab: "Detalle",
  tool: "Interpretación de resultados",
  title: "Interpretar una ejecución",
  description:
    "Qué significa cada estado de una ejecución y qué acción tomar en cada caso.",
  level: "basic",
  version: 1,
  route: "/internal/qa/runs",
  estimatedMinutes: 5,
  goal: "Analizar una prueba fallida",
  steps: [
    {
      id: "what",
      title: "¿Qué estás viendo?",
      content:
        "Un run es el registro de una ejecución: qué suite/paso se corrió, cuándo, cuánto tardó y en qué estado terminó cada paso. Es tu evidencia y tu punto de partida para depurar.",
    },
    {
      id: "states",
      title: "Los estados y su acción recomendada",
      content:
        "• Pendiente / En ejecución → espera.\n• Aprobado → lo esperado ocurrió; nada que hacer.\n• Fallido → el resultado real ≠ el esperado; abre el paso y compara.\n• Bloqueado → un paso previo impidió continuar; corrige la causa raíz.\n• Omitido → no se ejecutó (condición no cumplida).\n• Error de infraestructura → no falló la prueba, falló el entorno (DB caída, timeout de red); reintenta antes de reportar un bug.",
      relatedErrorCodes: ["STEP_FAILED", "STEP_BLOCKED", "INFRA_ERROR"],
    },
    {
      id: "fail",
      title: "Cuando un paso falla",
      content:
        "Abre el paso fallido y compara «esperado» vs «obtenido». La diferencia te dice si el bug está en el dato, en el endpoint o en la propia expectativa del caso (que quizá quedó desactualizada).",
      example:
        "Esperado: 200 con el cliente. Obtenido: 404. → El cliente no se creó en el paso anterior: el problema está aguas arriba, no en este paso.",
    },
  ],
};

export const qaConsoleTutorials: readonly TutorialDefinition[] = [
  suitesList,
  suiteDetail,
  runsInterpret,
];
