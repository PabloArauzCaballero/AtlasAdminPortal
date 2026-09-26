import type { Option } from "@/shared/lib/options";
import type { InstanceStageState, StepWiring } from "./types";

/**
 * El vocabulario de la sección Procesos en lenguaje de negocio.
 *
 * El backend habla en códigos (`ADMIN_PORTAL`, `internal_user`, `unwired`); quien abre la ficha
 * de un proceso es alguien de operaciones que no tiene por qué saberlos. Todo código que llega a
 * la pantalla pasa por aquí, y el que no está en el mapa sale tal cual en vez de inventarle un
 * nombre.
 */
const pick = (map: Record<string, string>, value: string | null | undefined) =>
  value ? (map[value] ?? value) : "—";

export const CLIENT_LABELS: Record<string, string> = {
  ADMIN_PORTAL: "Portal interno",
  ERP_PORTAL: "ERP",
  MOTOR_PORTAL: "Motor de decisiones",
  CONSUMER_APP: "App del cliente",
  DASHBOARDS_PORTAL: "Tableros",
  BLOCK: "Automático",
};
export const clientLabel = (value: string | null | undefined) =>
  pick(CLIENT_LABELS, value);

export const ACTOR_LABELS: Record<string, string> = {
  customer: "Cliente",
  internal_user: "Equipo interno",
  merchant_user: "Comercio",
  platform_user: "Equipo de plataforma",
  system: "Sistema",
  external_provider: "Proveedor externo",
};
export const actorLabel = (value: string | null | undefined) =>
  pick(ACTOR_LABELS, value);

export const SYSTEM_LABELS: Record<string, string> = {
  ATLAS_BACKEND: "Núcleo Atlas",
  DECISION_ENGINE: "Motor de decisiones",
  ERP_BACKEND: "ERP",
  DASHBOARDS: "Tableros",
  AI_SERVICE: "Asistente IA",
  EXTERNAL_PROVIDERS_MOCK: "Proveedores externos",
};
export const systemLabel = (value: string | null | undefined) =>
  pick(SYSTEM_LABELS, value);

export const PROCESS_TYPE_LABELS: Record<string, string> = {
  customer_journey: "Recorrido del cliente",
  partner_journey: "Recorrido del comercio",
  finance: "Finanzas",
  decisioning: "Decisiones",
  platform: "Plataforma",
  operations: "Operaciones",
};
export const processTypeLabel = (value: string | null | undefined) =>
  pick(PROCESS_TYPE_LABELS, value);

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Superadministración",
  OPERATIONS_MANAGER: "Jefatura de operaciones",
  RISK_ANALYST: "Análisis de riesgo",
  COMPLIANCE_OFFICER: "Cumplimiento",
  SUPPORT_AGENT: "Soporte",
  SYSTEMS_ADMIN: "Administración de sistemas",
  FINANCE_MANAGER: "Finanzas",
};
export const roleLabel = (value: string | null | undefined) =>
  pick(ROLE_LABELS, value);

export const STEP_KIND_LABELS: Record<string, string> = {
  http: "Acción en pantalla o servicio",
  event: "Aviso interno",
  job: "Tarea programada",
  manual: "Fuera del sistema",
  external: "Proveedor externo",
};

type Tone = "success" | "critical" | "warning" | "muted" | "info";

export const WIRING: Record<
  StepWiring,
  { label: string; tone: Tone; hint: string }
> = {
  wired: {
    label: "Con pantalla",
    tone: "success",
    hint: "La persona tiene una pantalla en su portal que hace este paso.",
  },
  unwired: {
    label: "Sin pantalla",
    tone: "critical",
    hint: "Una persona debería hacer este paso desde su portal, pero ninguna pantalla lo hace todavía.",
  },
  unknown: {
    label: "Sin comprobar",
    tone: "warning",
    hint: "El paso no aparece en el mapa de Flujos, así que no se puede saber si tiene pantalla.",
  },
  not_applicable: {
    label: "Automático",
    tone: "muted",
    hint: "Lo hace un sistema o el cliente desde la app: no necesita pantalla en un portal.",
  },
};

export const STAGE_STATE: Record<
  InstanceStageState,
  { label: string; tone: Tone }
> = {
  current: { label: "Está aquí", tone: "info" },
  reached: { label: "Superada", tone: "success" },
  unknown: { label: "Sin dato", tone: "muted" },
};

/** Las cinco comprobaciones que hacen «documentado» a un proceso, en el orden de la ficha. */
export const DOC_CHECKS = [
  {
    key: "narrative",
    label: "Las cinco preguntas contestadas",
    hint: "Cada respuesta tiene al menos 80 caracteres: menos no alcanza para explicarla.",
  },
  {
    key: "owner",
    label: "Tiene dueño",
    hint: "Un rol responsable de que el proceso funcione.",
  },
  {
    key: "instanceEntity",
    label: "Se sabe dónde viven sus casos",
    hint: "Declara en qué tabla está cada caso en curso, para poder contarlos.",
  },
  {
    key: "screens",
    label: "Cada etapa de personas tiene pantalla",
    hint: "Toda etapa que hace una persona en un portal dice en qué pantalla.",
  },
  {
    key: "inDatabase",
    label: "La base tiene la versión del código",
    hint: "El proceso guardado en la base coincide con el que declara el código desplegado.",
  },
] as const;

export const PRIORITY_OPTIONS: Option[] = [
  {
    value: "P0",
    label: "P0",
    description: "Sin él no hay negocio: alta, crédito, pagos, identidad.",
  },
  {
    value: "P1",
    label: "P1",
    description:
      "Importante para operar bien, con alternativa manual si falla.",
  },
  {
    value: "P2",
    label: "P2",
    description:
      "De soporte o de plataforma: mejora la operación, no la sostiene.",
  },
];

export const STATUS_FILTER_OPTIONS: Option[] = [
  {
    value: "documented",
    label: "Documentados",
    description: "Cumplen las cinco comprobaciones de documentación.",
  },
  {
    value: "undocumented",
    label: "Documentación incompleta",
    description: "Les falta al menos una de las cinco comprobaciones.",
  },
  {
    value: "unwired",
    label: "Con pasos sin pantalla",
    description:
      "Alguna persona tiene que hacer un paso que ningún portal hace.",
  },
  {
    value: "wired",
    label: "Totalmente cableados",
    description: "Todos los pasos de personas tienen su pantalla comprobada.",
  },
];

/**
 * La ruta del portal a la que lleva una etapa, sólo cuando la etapa vive en ESTE portal.
 *
 * `screen` es la ruta declarada en el proceso (`/internal/operations/pending-contacts`). Si lleva
 * parámetros (`:id`, `[id]`, `{instanceId}`) sólo se enlaza cuando hay un caso con el que
 * rellenarlos; si no, se enseña como texto para no mandar a una ruta rota.
 */
export function stageHref(
  client: string,
  screen: string | null | undefined,
  instanceId?: string,
): string | null {
  if (client !== "ADMIN_PORTAL" || !screen?.startsWith("/internal"))
    return null;
  const params = /:[A-Za-z_]+|\[[A-Za-z_]+\]|\{[A-Za-z_]+\}/;
  if (!params.test(screen)) return screen;
  if (!instanceId) return null;
  return screen.replace(
    new RegExp(params.source, "g"),
    encodeURIComponent(instanceId),
  );
}
