import type { Option } from "@/shared/lib/options";

/**
 * Los filtros de Catálogos y Definiciones.
 *
 * Antes eran listas de códigos crudos (`pending_approval`, `observation`) con la etiqueta igual
 * al valor. Los valores NO cambian —son los que acepta el backend—; lo que se añade es qué
 * significa cada uno.
 */
export const CATALOG_VERSION_STATUS_OPTIONS: Option[] = [
  {
    value: "draft",
    label: "Borrador",
    description:
      "Se está editando; el motor todavía no la ve ni la puede usar.",
  },
  {
    value: "pending_approval",
    label: "Pendiente de aprobación",
    description: "Enviada a revisión; espera la firma de un aprobador.",
  },
  {
    value: "approved",
    label: "Aprobada",
    description: "Firmada pero aún no publicada; entra en uso al publicarla.",
  },
  {
    value: "published",
    label: "Publicada",
    description: "La que el motor usa hoy dentro de sus fechas de vigencia.",
  },
  {
    value: "retired",
    label: "Retirada",
    description: "Ya no se usa; se conserva para explicar decisiones pasadas.",
  },
  {
    value: "all",
    label: "Todos los estados",
    description: "Incluye borradores y retiradas, además de las publicadas.",
  },
];

export const CATALOG_ACTIVE_OPTIONS: Option[] = [
  {
    value: "all",
    label: "Todos",
    description: "Catálogos encendidos y apagados, sin distinguir.",
  },
  {
    value: "true",
    label: "Activos",
    description: "Encendidos: el motor los consulta al decidir.",
  },
  {
    value: "false",
    label: "Inactivos",
    description: "Apagados sin borrarse; el motor los ignora.",
  },
];

export const DEFINITION_TYPE_OPTIONS: Option[] = [
  {
    value: "all",
    label: "Todos los tipos",
    description: "Eventos, observaciones, atributos y variables a la vez.",
  },
  {
    value: "event",
    label: "Evento",
    description: "Algo que ocurre en un momento, p. ej. un pago recibido.",
  },
  {
    value: "observation",
    label: "Observación",
    description: "Un dato medido sobre el cliente en una fecha concreta.",
  },
  {
    value: "attribute",
    label: "Atributo",
    description: "Una característica estable del cliente, p. ej. su ciudad.",
  },
  {
    value: "feature",
    label: "Variable del modelo",
    description: "Un valor calculado que el modelo de riesgo usa como entrada.",
  },
];

export const DEFINITION_STATUS_OPTIONS: Option[] = [
  {
    value: "all",
    label: "Todos",
    description: "Definiciones en uso y retiradas, sin distinguir.",
  },
  {
    value: "active",
    label: "Activa",
    description: "En uso: el motor la reconoce al recibir datos.",
  },
  {
    value: "inactive",
    label: "Inactiva",
    description: "Retirada; los datos con esta definición se ignoran.",
  },
];
