/**
 * Catálogo de errores conocidos con explicación didáctica. Convierte un
 * mensaje técnico ("TimeoutError: locator.click exceeded 30000ms") en algo que
 * un usuario no técnico entiende y puede corregir.
 */
import { getTutorialForError, type ErrorTutorialLink } from "./catalog";

export type ErrorExplanation = Readonly<{
  code: string;
  /** Título en lenguaje natural (no el nombre técnico del error). */
  title: string;
  /** Qué ocurrió, sin jerga. */
  whatHappened: string;
  /** Causas probables (lista corta). */
  likelyCauses: readonly string[];
  /** Consecuencia de negocio. */
  consequence: string;
  /** Pasos concretos de solución. */
  fixSteps: readonly string[];
  /** Acción recomendada de un vistazo. */
  recommendedAction: string;
  /** Enlace al tutorial + paso que lo explica (si existe). */
  tutorial?: ErrorTutorialLink;
}>;

const catalog: Record<string, Omit<ErrorExplanation, "tutorial">> = {
  HTTP_401: {
    code: "HTTP_401",
    title: "El servidor pidió identificarse",
    whatHappened:
      "La ruta respondió 401: no reconoció tu identidad o tus credenciales no son válidas.",
    likelyCauses: [
      "Tu sesión caducó o la credencial venció.",
      "La ruta requiere un permiso que tu usuario no tiene.",
      "Falta enviar la cabecera de autenticación.",
    ],
    consequence:
      "La prueba no llega a ejecutar la lógica real: se detiene en la puerta.",
    fixSteps: [
      "Vuelve a iniciar sesión para renovar la credencial.",
      "Confirma que tu rol tiene el permiso que pide la ruta.",
      "Reejecuta la prueba.",
    ],
    recommendedAction: "Renueva la sesión y reintenta.",
  },
  HTTP_404: {
    code: "HTTP_404",
    title: "La ruta probada no existe",
    whatHappened:
      "La ruta respondió 404: la dirección solicitada no corresponde a ningún registro.",
    likelyCauses: [
      "El registro (por ejemplo, un número de cliente) no existe o se borró.",
      "Un paso anterior no creó el dato que este esperaba.",
      "La ruta cambió en el servidor.",
    ],
    consequence: "El flujo se rompe aquí porque no encuentra con qué trabajar.",
    fixSteps: [
      "Revisa que el paso anterior devolvió el dato esperado.",
      "Comprueba que el número o dato usado existe.",
      "Actualiza la ruta si cambió en el servidor.",
    ],
    recommendedAction: "Verifica el dato del paso anterior.",
  },
  HTTP_500: {
    code: "HTTP_500",
    title: "El servidor tuvo un problema interno",
    whatHappened:
      "La ruta respondió 500: el fallo ocurrió DENTRO del servidor, no en tu prueba.",
    likelyCauses: [
      "Un defecto del servidor con esos datos concretos.",
      "Una dependencia (base de datos, otro servicio) caída.",
    ],
    consequence:
      "Es un defecto real del servidor: tu prueba hizo su trabajo al detectarlo.",
    fixSteps: [
      "Guarda la evidencia (petición y respuesta).",
      "Anota el código de soporte que muestra el portal.",
      "Reporta el defecto al equipo técnico responsable de esa ruta.",
    ],
    recommendedAction: "Reporta el defecto con el código de soporte.",
  },
  STRESS_THRESHOLD_EXCEEDED: {
    code: "STRESS_THRESHOLD_EXCEEDED",
    title: "La ruta no aguantó la carga",
    whatHappened:
      "Bajo carga, el tiempo de respuesta (p95) superó el umbral o aparecieron errores.",
    likelyCauses: [
      "La ruta no está preparada para ese volumen.",
      "Al servidor le falta capacidad u optimización para ese volumen.",
    ],
    consequence:
      "Con muchos usuarios reales, esta funcionalidad se degradaría o caería.",
    fixSteps: [
      "Baja los usuarios simultáneos para encontrar el punto donde sí aguanta.",
      "Comparte el resultado con el equipo técnico para optimizar.",
      "Repite la prueba tras la optimización.",
    ],
    recommendedAction:
      "Comparte el p95 con el equipo técnico antes de publicar.",
  },
  STRESS_CONFIG_INVALID: {
    code: "STRESS_CONFIG_INVALID",
    title: "La configuración de carga no es válida",
    whatHappened:
      "La simulación rechazó el perfil por un parámetro fuera de rango o incoherente.",
    likelyCauses: [
      "Un valor de usuarios simultáneos o duración desproporcionado (un cero de más).",
      "Un umbral imposible de cumplir.",
    ],
    consequence:
      "La barrera de seguridad evitó lanzar una carga que podía tumbar el ambiente.",
    fixSteps: [
      "Revisa usuarios simultáneos, duración y umbral con la ayuda de cada campo.",
      "Ajusta a valores realistas.",
      "Repite la simulación.",
    ],
    recommendedAction: "Corrige el parámetro señalado y repite la simulación.",
  },
  STEP_FAILED: {
    code: "STEP_FAILED",
    title: "Un paso terminó en fallo",
    whatHappened:
      "El resultado real del paso no coincidió con el resultado esperado.",
    likelyCauses: [
      "La ruta devolvió otra cosa de la esperada.",
      "La expectativa del caso quedó desactualizada.",
    ],
    consequence: "Hay una diferencia entre lo que debía pasar y lo que pasó.",
    fixSteps: [
      "Abre el paso y compara «esperado» vs «obtenido».",
      "Decide si el defecto está en el servidor o en la expectativa.",
      "Corrige y reejecuta.",
    ],
    recommendedAction: "Compara esperado vs obtenido en el paso.",
  },
  STEP_BLOCKED: {
    code: "STEP_BLOCKED",
    title: "Un paso quedó bloqueado",
    whatHappened:
      "Un paso previo falló y este no pudo ejecutarse por depender de él.",
    likelyCauses: ["El paso del que depende terminó en fallo o error."],
    consequence: "El bloqueo es un síntoma: la causa raíz está aguas arriba.",
    fixSteps: [
      "Ve al primer paso fallido de la cadena.",
      "Corrige esa causa raíz.",
      "Reejecuta la suite completa.",
    ],
    recommendedAction: "Corrige el primer paso fallido, no el bloqueado.",
  },
  INFRA_ERROR: {
    code: "INFRA_ERROR",
    title: "Falló el entorno, no la prueba",
    whatHappened:
      "La ejecución se cayó por un problema de infraestructura (timeout de red, base de datos no disponible).",
    likelyCauses: [
      "El ambiente destino estaba caído o saturado.",
      "Un timeout de red puntual.",
    ],
    consequence:
      "El resultado no es concluyente: no sabes si la funcionalidad está bien o mal.",
    fixSteps: [
      "Espera unos minutos.",
      "Confirma que el ambiente está arriba.",
      "Reintenta la ejecución.",
    ],
    recommendedAction: "Reintenta antes de reportar un defecto.",
  },
};

/**
 * Traduce un código de estado HTTP al código de error catalogado más cercano,
 * para poder mostrar ayuda contextual a partir de un fallo real del backend.
 * Devuelve `undefined` si no hay una explicación útil para ese estado.
 */
export function classifyHttpStatus(status: number): string | undefined {
  if (status === 401 || status === 403) return "HTTP_401";
  if (status === 404) return "HTTP_404";
  if (status >= 500) return "HTTP_500";
  return undefined;
}

export function explainError(code: string): ErrorExplanation | undefined {
  const base = catalog[code];
  if (!base) return undefined;
  return { ...base, tutorial: getTutorialForError(code) };
}

export function allErrorExplanations(): ErrorExplanation[] {
  return Object.keys(catalog).map((code) => explainError(code)!);
}
