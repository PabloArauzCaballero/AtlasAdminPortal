import type { Option } from "@/shared/lib/options";

/**
 * Los vocabularios de QA Console y QA Stress con lo que significa cada valor.
 *
 * Los valores siguen saliendo de las listas `as const` de `suite-schema.ts` y
 * `stress-profile-schema.ts`, que alimentan los `z.enum`; aquí sólo se les pone texto, en un
 * archivo aparte para no engordar el esquema.
 */
export const SUITE_TYPE_OPTIONS: Option[] = [
  {
    value: "INTEGRATION",
    label: "Integración",
    description:
      "Prueba que varios módulos funcionan juntos contra la base real.",
  },
  {
    value: "SMOKE",
    label: "Humo (arranque)",
    description:
      "Pocos pasos rápidos para saber si el sistema arrancó bien tras desplegar.",
  },
  {
    value: "REGRESSION",
    label: "Regresión",
    description: "Cubre fallos ya corregidos para que no vuelvan a aparecer.",
  },
  {
    value: "E2E_API",
    label: "Recorrido completo",
    description:
      "Recorre un flujo de negocio completo sólo a través de la API.",
  },
  {
    value: "LOAD",
    label: "Carga",
    description: "Mide cómo responde la ruta bajo volumen sostenido.",
  },
];

export const ENVIRONMENT_OPTIONS: Option[] = [
  {
    value: "LOCAL",
    label: "Local",
    description: "Tu máquina o un contenedor de desarrollo; datos desechables.",
  },
  {
    value: "STAGING",
    label: "Pruebas (preproducción)",
    description: "Entorno de pruebas compartido, parecido a producción.",
  },
  {
    value: "PRODUCTION_READONLY",
    label: "Producción en solo lectura",
    description: "Producción sólo en lectura; exige suite marcada como segura.",
  },
];

export const HTTP_METHOD_OPTIONS: Option[] = [
  {
    value: "GET",
    label: "GET",
    description: "Lee datos sin cambiar nada en el servidor.",
  },
  {
    value: "POST",
    label: "POST",
    description: "Crea un recurso o dispara una acción.",
  },
  {
    value: "PUT",
    label: "PUT",
    description: "Reemplaza un recurso completo por el enviado.",
  },
  {
    value: "PATCH",
    label: "PATCH",
    description: "Cambia sólo algunos campos de un recurso.",
  },
  {
    value: "DELETE",
    label: "DELETE",
    description: "Borra o da de baja un recurso.",
  },
  {
    value: "OPTIONS",
    label: "OPTIONS",
    description: "Pregunta qué métodos y cabeceras admite la ruta.",
  },
  {
    value: "HEAD",
    label: "HEAD",
    description: "Como GET pero sin cuerpo; sólo cabeceras.",
  },
];

export const STEP_INPUT_MODE_OPTIONS: Option[] = [
  {
    value: "DEFAULT",
    label: "Datos por defecto",
    description:
      "Envía el cuerpo y las cabeceras por defecto del paso, tal cual.",
  },
  {
    value: "CONFIGURABLE",
    label: "Configurable al ejecutar",
    description:
      "Pide parámetros al ejecutar, según los parámetros configurables del paso.",
  },
  {
    value: "GENERATED",
    label: "Datos generados",
    description:
      "Genera datos de prueba nuevos en cada corrida (correos, IDs).",
  },
  {
    value: "FROM_PREVIOUS_STEP",
    label: "Del paso anterior",
    description:
      "Usa lo que extrajo el paso anterior, p. ej. un token o un ID.",
  },
];

export const RUN_STATUS_OPTIONS: Option[] = [
  {
    value: "QUEUED",
    label: "En cola",
    description: "Encolada; espera a que haya capacidad libre.",
  },
  {
    value: "RUNNING",
    label: "En curso",
    description: "Se está ejecutando ahora mismo.",
  },
  {
    value: "PASSED",
    label: "Aprobada",
    description: "Terminó y todas las comprobaciones pasaron.",
  },
  {
    value: "FAILED",
    label: "Fallida",
    description: "Terminó con al menos una comprobación fallida.",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
    description: "Detenida antes de terminar; sin veredicto.",
  },
];

export const STRESS_PROFILE_STATUS_OPTIONS: Option[] = [
  {
    value: "ACTIVE",
    label: "Activo",
    description: "En uso: se puede encolar una corrida con él.",
  },
  {
    value: "DISABLED",
    label: "Desactivado",
    description: "Apagado a mano; no se puede encolar.",
  },
  {
    value: "NEEDS_REVIEW",
    label: "Por revisar",
    description: "La ruta cambió; revisa umbrales antes de usarlo.",
  },
  {
    value: "DEPRECATED",
    label: "Obsoleto",
    description: "Obsoleto; se conserva sólo por el historial.",
  },
];

/**
 * Estados de una corrida de ESTRÉS: son los de la cola de trabajos de Core
 * (`queued`, `running`, `completed`, `failed`), no los de una suite. `PASSED` y
 * `CANCELLED` no existen ahí: ofrecerlos daba siempre una tabla vacía.
 */
export const STRESS_RUN_STATUS_OPTIONS: Option[] = [
  {
    value: "QUEUED",
    label: "En cola",
    description: "En cola; espera al servicio que ejecuta la carga.",
  },
  {
    value: "RUNNING",
    label: "En curso",
    description: "El servicio de carga la está ejecutando ahora.",
  },
  {
    value: "COMPLETED",
    label: "Completada",
    description: "Terminó; el veredicto de umbrales está en su resultado.",
  },
  {
    value: "FAILED",
    label: "Fallida",
    description: "No pudo ejecutarse o se cortó; mira el error.",
  },
];
