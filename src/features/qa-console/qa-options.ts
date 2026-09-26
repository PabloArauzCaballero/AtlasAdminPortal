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
    label: "INTEGRATION",
    description:
      "Prueba que varios módulos funcionan juntos contra la base real.",
  },
  {
    value: "SMOKE",
    label: "SMOKE",
    description:
      "Pocos pasos rápidos para saber si el sistema arrancó bien tras desplegar.",
  },
  {
    value: "REGRESSION",
    label: "REGRESSION",
    description: "Cubre fallos ya corregidos para que no vuelvan a aparecer.",
  },
  {
    value: "E2E_API",
    label: "E2E_API",
    description:
      "Recorre un flujo de negocio completo sólo a través de la API.",
  },
  {
    value: "LOAD",
    label: "LOAD",
    description: "Mide cómo responde el endpoint bajo volumen sostenido.",
  },
];

export const ENVIRONMENT_OPTIONS: Option[] = [
  {
    value: "LOCAL",
    label: "LOCAL",
    description: "Tu máquina o un contenedor de desarrollo; datos desechables.",
  },
  {
    value: "STAGING",
    label: "STAGING",
    description: "Entorno de pruebas compartido, parecido a producción.",
  },
  {
    value: "PRODUCTION_READONLY",
    label: "PRODUCTION_READONLY",
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
    label: "DEFAULT",
    description:
      "Envía el payload y las cabeceras por defecto del paso, tal cual.",
  },
  {
    value: "CONFIGURABLE",
    label: "CONFIGURABLE",
    description:
      "Pide parámetros al ejecutar, según el config schema del paso.",
  },
  {
    value: "GENERATED",
    label: "GENERATED",
    description:
      "Genera datos de prueba nuevos en cada corrida (correos, IDs).",
  },
  {
    value: "FROM_PREVIOUS_STEP",
    label: "FROM_PREVIOUS_STEP",
    description:
      "Usa lo que extrajo el paso anterior, p. ej. un token o un ID.",
  },
];

export const RUN_STATUS_OPTIONS: Option[] = [
  {
    value: "QUEUED",
    label: "QUEUED",
    description: "Encolada; espera un trabajador libre.",
  },
  {
    value: "RUNNING",
    label: "RUNNING",
    description: "Se está ejecutando ahora mismo.",
  },
  {
    value: "PASSED",
    label: "PASSED",
    description: "Terminó y todas las comprobaciones pasaron.",
  },
  {
    value: "FAILED",
    label: "FAILED",
    description: "Terminó con al menos una comprobación fallida.",
  },
  {
    value: "CANCELLED",
    label: "CANCELLED",
    description: "Detenida antes de terminar; sin veredicto.",
  },
];

export const STRESS_PROFILE_STATUS_OPTIONS: Option[] = [
  {
    value: "ACTIVE",
    label: "ACTIVE",
    description: "En uso: se puede encolar una corrida con él.",
  },
  {
    value: "DISABLED",
    label: "DISABLED",
    description: "Apagado a mano; no se puede encolar.",
  },
  {
    value: "NEEDS_REVIEW",
    label: "NEEDS_REVIEW",
    description: "El endpoint cambió; revisa umbrales antes de usarlo.",
  },
  {
    value: "DEPRECATED",
    label: "DEPRECATED",
    description: "Obsoleto; se conserva sólo por el historial.",
  },
];
