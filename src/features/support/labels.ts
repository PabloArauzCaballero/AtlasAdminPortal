import type { ComponentProps } from "react";
import type { Badge } from "@/shared/components/ui/badges";

/**
 * Cómo se nombra cada código de soporte en la pantalla.
 *
 * El servidor habla en códigos (`WAITING_CUSTOMER`, `TECHNICAL_INCIDENT`, `CASE_TRANSFERRED`) y así
 * llegaban a la tabla, al detalle y a la historia. Aquí vive la traducción, en un solo sitio, para
 * que la misma palabra se lea igual en las tres. Un código que no esté en el mapa no se enseña
 * crudo: `legible` lo convierte en texto corrido en vez de inventarle un significado.
 */
export type Tono = NonNullable<ComponentProps<typeof Badge>["tone"]>;

export type Etiqueta = { label: string; tone: Tono };

/** «SOME_NEW_CODE» → «Some new code». Para lo que el mapa todavía no conoce. */
export function legible(codigo: string | null | undefined): string {
  if (!codigo) return "—";
  const texto = codigo.replaceAll(/[_.]+/g, " ").trim().toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function desde(mapa: Record<string, string>, codigo?: string | null): string {
  if (!codigo) return "—";
  return mapa[codigo] ?? legible(codigo);
}

/** Los catorce estados de `SUPPORT_CASE_TRANSITIONS`, con el tono que dice si hay que actuar. */
export const ESTADOS_CASO: Record<string, Etiqueta> = {
  NEW: { label: "Nuevo", tone: "info" },
  TRIAGED: { label: "Clasificado", tone: "info" },
  ASSIGNED: { label: "Asignado", tone: "default" },
  IN_PROGRESS: { label: "En curso", tone: "info" },
  WAITING_CUSTOMER: { label: "Esperando al cliente", tone: "warning" },
  WAITING_INTERNAL: { label: "Esperando a otro equipo", tone: "warning" },
  WAITING_PARTNER: { label: "Esperando al comercio", tone: "warning" },
  ESCALATED: { label: "Escalado", tone: "critical" },
  ON_HOLD: { label: "En pausa", tone: "muted" },
  RESOLVED: { label: "Resuelto", tone: "success" },
  CLOSED: { label: "Cerrado", tone: "muted" },
  REOPENED: { label: "Reabierto", tone: "warning" },
  DUPLICATE: { label: "Duplicado", tone: "muted" },
  CANCELLED: { label: "Cancelado", tone: "muted" },
};

export function estadoCaso(codigo?: string | null): Etiqueta {
  if (!codigo) return { label: "—", tone: "muted" };
  return ESTADOS_CASO[codigo] ?? { label: legible(codigo), tone: "default" };
}

export const PRIORIDADES: Record<string, Etiqueta> = {
  P1: { label: "P1 · Crítica", tone: "critical" },
  P2: { label: "P2 · Alta", tone: "warning" },
  P3: { label: "P3 · Normal", tone: "info" },
  P4: { label: "P4 · Baja", tone: "muted" },
};

export function prioridad(codigo?: string | null): Etiqueta {
  if (!codigo) return { label: "Sin prioridad", tone: "muted" };
  return PRIORIDADES[codigo] ?? { label: legible(codigo), tone: "default" };
}

const TIPOS_CASO: Record<string, string> = {
  QUESTION: "Consulta",
  SERVICE_REQUEST: "Solicitud de servicio",
  TECHNICAL_INCIDENT: "Falla técnica",
  ACCOUNT_ACCESS: "Acceso a la cuenta",
  IDENTITY_KYC: "Verificación de identidad",
  CREDIT_DECISION_EXPLANATION: "Explicación de una decisión de crédito",
  PURCHASE_SUPPORT: "Ayuda con una compra",
  PAYMENT_EVIDENCE: "Comprobante de pago",
  QR_SUPPORT: "Ayuda con el cobro por QR",
  PARTNER_ONBOARDING: "Alta de comercio",
  PARTNER_OPERATION: "Operación del comercio",
  RECONCILIATION_SUPPORT: "Conciliación",
  BILLING_MDR_SUPPORT: "Facturación y comisiones",
  COMPLAINT: "Reclamo",
  PRIVACY_REQUEST: "Pedido sobre datos personales",
  SECURITY_INCIDENT: "Incidente de seguridad",
  FRAUD_REPORT: "Denuncia de fraude",
  BUG_REPORT: "Error del producto",
  FEATURE_REQUEST: "Pedido de mejora",
  DATA_CORRECTION_REQUEST: "Corrección de datos",
  OTHER: "Otro",
};

export const tipoCaso = (codigo?: string | null) => desde(TIPOS_CASO, codigo);

const DOMINIOS: Record<string, string> = {
  AUTH: "Ingreso y contraseñas",
  PROFILE: "Perfil",
  KYC: "Identidad",
  CREDIT: "Crédito",
  PURCHASE: "Compras",
  INSTALLMENTS: "Cuotas",
  PAYMENT: "Pagos",
  QR: "Cobro por QR",
  PARTNER: "Comercios",
  NOTIFICATIONS: "Avisos",
  DOCUMENTS: "Documentos",
  REPORTING: "Reportes",
  SECURITY: "Seguridad",
  PRIVACY: "Privacidad",
  PLATFORM: "Plataforma",
  OTHER: "Otro",
};

export const dominio = (codigo?: string | null) => desde(DOMINIOS, codigo);

const SENSIBILIDADES: Record<string, string> = {
  NORMAL: "Normal",
  SENSITIVE: "Sensible",
  RESTRICTED: "Restringido",
};

export const sensibilidad = (codigo?: string | null) =>
  desde(SENSIBILIDADES, codigo);

const IMPACTOS: Record<string, string> = {
  INDIVIDUAL: "una persona",
  MULTI_USER: "varias personas",
  PARTNER: "un comercio",
  MULTI_PARTNER: "varios comercios",
  REGIONAL: "una región",
  PLATFORM_WIDE: "toda la plataforma",
};

export const impacto = (codigo?: string | null) => desde(IMPACTOS, codigo);

const URGENCIAS: Record<string, string> = {
  LOW: "baja",
  NORMAL: "normal",
  HIGH: "alta",
  CRITICAL: "crítica",
};

export const urgencia = (codigo?: string | null) => desde(URGENCIAS, codigo);

const SUJETOS: Record<string, string> = {
  CONSUMER: "clientes",
  PARTNER_USER: "usuarios de comercios",
  PARTNER_ORGANIZATION: "comercios",
  INTERNAL: "personal interno",
};

/** A quién atiende una cola o de quién es un caso. */
export const sujeto = (codigo?: string | null) => desde(SUJETOS, codigo);

/** Quién hizo algo: en la historia del caso y en la conversación. */
const ACTORES: Record<string, string> = {
  CUSTOMER: "Cliente",
  PARTNER_USER: "Comercio",
  AGENT: "Agente",
  SUPERVISOR: "Supervisor",
  SYSTEM: "Sistema",
};

export const actor = (codigo?: string | null) => desde(ACTORES, codigo);

/** Los eventos que escribe el módulo de soporte en la historia del expediente. */
const EVENTOS: Record<string, string> = {
  CASE_CREATED: "Caso abierto",
  CASE_TRIAGED: "Caso clasificado",
  CASE_ASSIGNED: "Caso asignado",
  CASE_TRANSFERRED: "Caso transferido a otra cola",
  CASE_ESCALATED: "Caso escalado",
  CASE_STATUS_CHANGED: "Cambio de estado",
  CASE_NOTE_ADDED: "Nota interna añadida",
  CASE_LINKED: "Vinculado con otro caso",
  CASE_RESOLVED: "Caso resuelto",
  CASE_CLOSED: "Caso cerrado",
  CASE_REOPENED: "Caso reabierto",
  CLOSE_REQUESTED: "El cliente pidió cerrar",
  REOPEN_REQUESTED: "El cliente pidió reabrir",
  CHANNEL_OPENED: "Conversación abierta",
  CHANNEL_CLOSED: "Conversación cerrada",
  FIRST_RESPONSE_RECORDED: "Primera respuesta al cliente",
  FEEDBACK_SUBMITTED: "El cliente valoró la atención",
  SLA_WARNING: "Aviso: el plazo de atención se acerca",
  SLA_BREACHED: "Plazo de atención vencido",
  SLA_CLOCK_PAUSED: "Plazo de atención en pausa",
  SLA_CLOCK_RESUMED: "Plazo de atención reanudado",
};

export const evento = (codigo?: string | null) => desde(EVENTOS, codigo);
