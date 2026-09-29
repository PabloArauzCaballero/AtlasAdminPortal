import type { JsonRecord, PaginationMeta } from "@/shared/api/types";

/**
 * Las siete vistas gobernadas de `/internal/views`.
 *
 * El backend las sirve desde `read_api.v_*`, que es la razón de que existan: dan a operaciones una
 * lectura del negocio SIN acceso a las tablas sensibles. Existían desde el principio —el propio
 * controlador dice que compone «una vista gobernada para el portal administrativo»— y ninguna
 * pantalla las llamaba, así que la única forma de mirarlas era por SQL contra la base.
 *
 * Cada vista declara qué filtros admite el backend y cómo se llama cada columna en pantalla. La
 * lista de columnas NO se fija aquí: viene en `meta.selectedFields` de cada respuesta, porque el
 * endpoint proyecta campos a la carta. Fijarla aquí volvería a partir en dos la misma verdad.
 */

export type GovernedViewKey =
  | "customers"
  | "risk-assessments"
  | "work-queue"
  | "provider-health"
  | "notification-deliveries"
  | "endpoint-coverage"
  | "audit-events";

/** Un desplegable de la vista. Sus valores los publica el servidor (`/internal/views/:view/facets`). */
export type GovernedViewFilter = {
  name: string;
  label: string;
  kind: "facet";
};

export type GovernedViewDefinition = {
  key: GovernedViewKey;
  label: string;
  description: string;
  /** Por qué columnas busca `q` en ESTA vista (lo que declara el servidor en `admin-read.views.ts`). */
  search: string;
  /** Los filtros que el esquema Zod del backend admite. Mandar otro devuelve 400: son `.strict()`. */
  filters: GovernedViewFilter[];
};

export type GovernedViewRow = JsonRecord;

export type GovernedViewMeta = PaginationMeta & {
  /** Qué columnas trae esta respuesta. Es lo que dibuja la tabla. */
  selectedFields?: string[];
};

export type GovernedViewFacets = {
  view: GovernedViewKey;
  facets: Record<string, string[]>;
};

export type GovernedViewResponse = {
  items: GovernedViewRow[];
  meta: GovernedViewMeta;
};

export const GOVERNED_VIEWS: GovernedViewDefinition[] = [
  {
    key: "customers",
    label: "Clientes",
    description:
      "Ficha resumida por cliente: estado de ciclo de vida, última decisión de riesgo y qué tiene abierto.",
    search: "código o nombre del cliente",
    filters: [
      { name: "status", label: "Estado", kind: "facet" },
      { name: "riskBand", label: "Banda de riesgo", kind: "facet" },
    ],
  },
  {
    key: "risk-assessments",
    label: "Decisiones de riesgo",
    description:
      "Cada evaluación con su modelo, su puntuación y si exigió revisión manual o disparó un corte duro.",
    search: "tipo de evaluación, versión de modelo o de reglas",
    filters: [
      { name: "status", label: "Estado", kind: "facet" },
      { name: "riskBand", label: "Banda", kind: "facet" },
      { name: "decision", label: "Decisión", kind: "facet" },
    ],
  },
  {
    key: "work-queue",
    label: "Cola operativa",
    description:
      "Lo que espera intervención humana, de todos los orígenes a la vez: revisiones, casos y alertas.",
    search: "motivo o identificador del elemento",
    filters: [
      { name: "type", label: "Tipo", kind: "facet" },
      { name: "status", label: "Estado", kind: "facet" },
      { name: "priority", label: "Prioridad", kind: "facet" },
      { name: "severity", label: "Severidad", kind: "facet" },
    ],
  },
  {
    key: "provider-health",
    label: "Salud de proveedores",
    description:
      "El último sondeo de cada proveedor externo: en qué modo respondió, con cuánta latencia y con qué error.",
    search: "código, nombre o error del proveedor",
    filters: [
      { name: "healthStatus", label: "Salud", kind: "facet" },
      { name: "providerStatus", label: "Estado del proveedor", kind: "facet" },
    ],
  },
  {
    key: "notification-deliveries",
    label: "Entrega de notificaciones",
    description:
      "Qué se envió, por qué canal y en cuántos intentos. El último código de error explica lo que no llegó.",
    search: "plantilla o último código de error",
    filters: [
      { name: "status", label: "Estado", kind: "facet" },
      { name: "channel", label: "Canal", kind: "facet" },
      { name: "category", label: "Categoría", kind: "facet" },
    ],
  },
  {
    key: "endpoint-coverage",
    label: "Cobertura de operaciones",
    description:
      "Qué operaciones hay, cuáles tocan datos personales o borran datos, y cuáles están listas para publicar.",
    search: "ruta o método",
    filters: [
      { name: "module", label: "Módulo", kind: "facet" },
      { name: "riskLevel", label: "Riesgo", kind: "facet" },
      { name: "reviewStatus", label: "Revisión", kind: "facet" },
    ],
  },
  {
    key: "audit-events",
    label: "Eventos de auditoría",
    description:
      "El rastro unificado: quién actuó, sobre qué y cuándo, sin entrar a cada tabla de origen.",
    search: "tipo de evento, tipo o id del objetivo, o tabla de origen",
    filters: [
      { name: "eventType", label: "Tipo de evento", kind: "facet" },
      { name: "actorType", label: "Tipo de actor", kind: "facet" },
      { name: "targetType", label: "Tipo de objetivo", kind: "facet" },
    ],
  },
];

/**
 * Cómo se lee cada columna en castellano.
 *
 * Las siete vistas comparten muchos nombres (`customerId`, `status`, `createdAt`), así que el mapa
 * es uno solo. Lo que no esté aquí se muestra con su nombre técnico separado en palabras: es
 * preferible a esconder una columna que el backend sí devuelve.
 */
export const FIELD_LABELS: Record<string, string> = {
  customerId: "Cliente",
  customerCode: "Código",
  customerUuid: "Identificador",
  lifecycleStatus: "Ciclo de vida",
  displayName: "Nombre",
  birthDate: "Nacimiento",
  preferredLanguage: "Idioma",
  primaryEmailDomain: "Dominio de correo",
  primaryPhoneLast4: "Teléfono ····",
  latestRiskAssessmentRunId: "Última evaluación",
  latestRiskDecision: "Última decisión",
  latestRiskBand: "Última banda",
  latestRiskScore: "Última puntuación",
  latestRiskDecidedAt: "Decidida",
  activeConsentCount: "Consentimientos",
  activeDeviceCount: "Dispositivos",
  openManualReviewCount: "Revisiones abiertas",
  openFraudCaseCount: "Casos de fraude",
  lastActivityAt: "Última actividad",
  riskAssessmentRunId: "Evaluación",
  status: "Estado",
  assessmentType: "Tipo",
  requestedAt: "Solicitada",
  completedAt: "Completada",
  decidedAt: "Decidida",
  modelVersionCode: "Modelo",
  rulesetVersionCode: "Reglas",
  score: "Puntuación",
  riskBand: "Banda",
  decision: "Decisión",
  reasonCodes: "Motivos",
  manualReviewRequired: "Revisión manual",
  hardStopTriggered: "Corte duro",
  type: "Tipo",
  itemId: "Elemento",
  priority: "Prioridad",
  severity: "Severidad",
  reasonCode: "Motivo",
  assignedTo: "Asignado a",
  createdAt: "Creado",
  dueAt: "Vence",
  updatedAt: "Actualizado",
  providerId: "Proveedor",
  providerCode: "Código",
  providerName: "Proveedor",
  providerStatus: "Estado del proveedor",
  healthStatus: "Salud",
  modeChecked: "Modo",
  latencyMs: "Respuesta (ms)",
  checkedAt: "Comprobado",
  errorCode: "Error",
  messageId: "Mensaje",
  templateCode: "Plantilla",
  channel: "Canal",
  recipientType: "Destinatario",
  category: "Categoría",
  scheduledAt: "Programado",
  sentAt: "Enviado",
  deliveredAt: "Entregado",
  failedAt: "Falló",
  attemptCount: "Intentos",
  deliveredCount: "Entregados",
  failedCount: "Fallidos",
  lastAttemptAt: "Último intento",
  lastErrorCode: "Último error",
  endpointId: "Operación",
  method: "Método",
  fullPath: "Ruta",
  module: "Módulo",
  riskLevel: "Riesgo",
  reviewStatus: "Revisión",
  requiresAuth: "Exige sesión",
  containsPii: "Datos personales",
  readonly: "Sólo lectura",
  destructive: "Destructivo",
  sensitiveFieldCount: "Campos sensibles",
  dataEntityCount: "Entidades",
  moduleTestSuiteCount: "Pruebas",
  releaseReady: "Listo",
  sourceTable: "Tabla origen",
  sourceId: "Id origen",
  occurredAt: "Ocurrió",
  actorType: "Actor",
  eventType: "Evento",
  targetType: "Objetivo",
  targetId: "Id objetivo",
};
