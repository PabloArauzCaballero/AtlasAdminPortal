import type { Option } from "@/shared/lib/options";
import type { CampaignAction, CampaignStatus } from "./types";

type Tone = "success" | "warning" | "critical" | "muted" | "info";

/**
 * El estado de una campaña en palabras de quien la opera. El valor es el del servidor y no cambia;
 * lo que se traduce es la etiqueta y lo que significa.
 */
export const CAMPAIGN_STATUS: Record<
  CampaignStatus,
  { label: string; tone: Tone; description: string }
> = {
  draft: {
    label: "Borrador",
    tone: "muted",
    description: "Se está armando en el ERP; todavía no envía nada.",
  },
  scheduled: {
    label: "Programada",
    tone: "info",
    description: "Tiene fecha de inicio y audiencia congelada; espera su hora.",
  },
  running: {
    label: "Enviando",
    tone: "success",
    description: "Está repartiendo avisos a su ritmo por minuto.",
  },
  paused: {
    label: "Pausada",
    tone: "warning",
    description: "Detenida a mano; los avisos pendientes esperan a reanudarla.",
  },
  completed: {
    label: "Terminada",
    tone: "success",
    description: "Ya repartió todos sus avisos o llegó al fin de su ventana.",
  },
  cancelled: {
    label: "Cancelada",
    tone: "muted",
    description: "Anulada con motivo; lo que no había salido ya no saldrá.",
  },
  failed: {
    label: "Falló",
    tone: "critical",
    description: "Se detuvo por un error; el detalle dice cuál fue.",
  },
};

export const CAMPAIGN_STATUS_OPTIONS: Option[] = (
  Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]
).map((value) => ({
  value,
  label: CAMPAIGN_STATUS[value].label,
  description: CAMPAIGN_STATUS[value].description,
}));

export const PURPOSE_LABEL: Record<string, string> = {
  marketing: "Comercial",
  operational: "Operativa",
};

/** Qué estados admite cada palanca. Es copia de la regla del servidor, que es quien decide. */
export const ACTION_ALLOWED_FROM: Record<CampaignAction, CampaignStatus[]> = {
  pause: ["running"],
  resume: ["paused"],
  cancel: ["draft", "scheduled", "running", "paused"],
};

export function allowedActions(status: CampaignStatus): CampaignAction[] {
  return (Object.keys(ACTION_ALLOWED_FROM) as CampaignAction[]).filter(
    (action) => ACTION_ALLOWED_FROM[action].includes(status),
  );
}

const ATTRIBUTE_LABEL: Record<string, string> = {
  city: "Ciudad",
  department: "Departamento",
  lifecycleStatus: "Estado del cliente",
  hasCreditLine: "Tiene línea de crédito",
  hasActiveLoan: "Tiene un crédito activo",
  hasOverdueInstallment: "Tiene una cuota vencida",
  daysSinceSignup: "Días desde el alta",
  hasPushDevice: "Tiene la app con avisos",
  pushPlatform: "Plataforma del teléfono",
  hasVerifiedEmail: "Tiene correo verificado",
  marketingOptIn: "Aceptó avisos comerciales",
};

const OPERATOR_LABEL: Record<string, string> = {
  eq: "es",
  neq: "no es",
  in: "es uno de",
  not_in: "no es ninguno de",
  gte: "al menos",
  lte: "como mucho",
};

/** Una regla de audiencia leída en voz alta: «Ciudad es uno de La Paz, El Alto». */
export function describeRule(rule: {
  attribute: string;
  operator: string;
  value?: string | number | string[];
}): string {
  const attribute = ATTRIBUTE_LABEL[rule.attribute] ?? rule.attribute;
  if (rule.operator === "is_true") return attribute;
  if (rule.operator === "is_false") return `No: ${attribute.toLowerCase()}`;
  const value = Array.isArray(rule.value)
    ? rule.value.join(", ")
    : String(rule.value ?? "—");
  return `${attribute} ${OPERATOR_LABEL[rule.operator] ?? rule.operator} ${value}`;
}

export const CAMPAIGN_CHANNEL_OPTIONS: Option[] = [
  {
    value: "in_app",
    label: "in_app",
    description: "Aparece en la bandeja de avisos dentro de la app.",
  },
  {
    value: "push",
    label: "push",
    description: "Notificación en el teléfono, aunque la app esté cerrada.",
  },
  {
    value: "email",
    label: "email",
    description: "Correo al buzón verificado del cliente.",
  },
];
