/**
 * Espejo de los DTO del expediente.
 *
 * Se declaran aquí y no se importan del backend porque son dos repositorios; lo que los mantiene
 * alineados es el contrato HTTP, no un tipo compartido. Lo que NO está —a propósito— es la clave
 * del objeto en el almacén: el backend no la publica, y el contenido se pide siempre por `nodoId`.
 */
import type { PaginatedResponse } from "@/shared/api/types";

export const NIVELES = [
  "leer",
  "escribir",
  "compartir",
  "administrar",
] as const;
export type Nivel = (typeof NIVELES)[number];

export type EstadoExpediente = "abierto" | "enviado" | "cerrado" | "purgado";
export type TipoNodo = "carpeta" | "archivo";
export type OrigenNodo = "onboarding" | "motor" | "portal" | "sistema";

export type Expediente = {
  expedienteId: string;
  subjectType: string;
  subjectId: string;
  sessionId: string | null;
  customerCode: string | null;
  estado: EstadoExpediente;
  enviadoEn: string | null;
  manifestPresente: boolean;
  retencionHasta: string | null;
  purgadoEn: string | null;
  creadoEn: string;
  nivelEfectivo: Nivel | null;
  nodosTotal: number | null;
  bytesTotal: string | null;
};

export type Nodo = {
  nodoId: string;
  parentId: string | null;
  tipo: TipoNodo;
  nombre: string;
  ruta: string;
  origen: OrigenNodo;
  clase: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  sha256: string | null;
  objetoAusente: boolean;
  inmutable: boolean;
  evidenceDocumentId: string | null;
  engineRequestId: string | null;
  creadoEn: string;
  actualizadoEn: string;
  borradoEn: string | null;
  nivelEfectivo: Nivel | null;
};

export type Actividad = {
  actividadId: string;
  nodoId: string | null;
  accion: string;
  actorTipo: string;
  actorId: string | null;
  detalle: Record<string, unknown>;
  ocurridoEn: string;
};

export type Concesion = {
  id: string;
  principalTipo: "rol" | "usuario_interno";
  principalId: string;
  nivel: Nivel;
  motivo: string | null;
  venceEn: string | null;
  otorgadaEn: string;
  /** La ruta del nodo del que viene, o `null` si está puesta en este mismo. */
  heredadaDe: string | null;
};

export type TicketDeSubida = {
  ticketId: string;
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  expiresAt: string;
};

export type Contactos = {
  version: number;
  generadoEn: string;
  customerId: string;
  enmascarado: boolean;
  metodosDeContacto: Array<{
    tipo: string | null;
    valor: string | null;
    esPrincipal: boolean;
    estado: string | null;
    origen: string | null;
    vistoPorPrimeraVez: string | null;
  }>;
  referencias: Array<{
    relacion: string | null;
    nombre: string | null;
    telefono: string | null;
    telefonoUltimos4: string | null;
    baseDeConsentimiento: string | null;
    contactabilidad: string | null;
    verificacion: string | null;
    notificada: boolean;
    notificadaEn: string | null;
  }>;
  agenda: {
    estado: string;
    fichasGuardadas?: boolean;
    recuentos: Record<string, number>;
  };
};

export type ExpedienteListResponse = PaginatedResponse<Expediente>;
export type ActividadListResponse = PaginatedResponse<Actividad>;

/** Un nivel alcanza al requerido si está igual o más arriba en la escala. */
export function alcanza(actual: Nivel | null, requerido: Nivel): boolean {
  if (!actual) return false;
  return NIVELES.indexOf(actual) >= NIVELES.indexOf(requerido);
}
