import { apiRequest } from "@/shared/api/client";
import { getApiBaseUrl } from "@/shared/api/config";
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import type { QueryParams } from "@/shared/api/types";
import type {
  AssignInput,
  SupportLiveEvent,
  SupportTranscript,
  CloseInput,
  CreateAgentInput,
  EscalateInput,
  ResolveInput,
  SupportAgentProfile,
  SupportCaseDetail,
  SupportCaseListResponse,
  SupportCaseTimeline,
  SupportCategory,
  SupportChannel,
  SupportCodes,
  SupportQueue,
  TriageInput,
} from "./types";
import { subscribeToServerEvents } from "@/shared/api/server-events";

/**
 * Cada acción del caso lleva clave de idempotencia.
 *
 * No es ceremonia: `triage`, `escalate`, `resolve` y `close` escriben eventos en la cadena de hash
 * del expediente, y un doble clic con la red lenta dejaría el mismo movimiento dos veces en la
 * historia que después se audita.
 */
function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function accion<T>(path: string, prefix: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body,
    headers: { "x-idempotency-key": idempotencyKey(prefix) },
  });
}

export function listSupportCases(query: QueryParams) {
  return apiRequest<SupportCaseListResponse>("/internal/support/cases", {
    query,
  });
}

export function getSupportCase(caseId: string) {
  return apiRequest<SupportCaseDetail>(`/internal/support/cases/${caseId}`);
}

export function getSupportCaseTimeline(caseId: string) {
  return apiRequest<SupportCaseTimeline>(
    `/internal/support/cases/${caseId}/timeline`,
  );
}

export function listSupportCategories() {
  return apiRequest<{ categories: SupportCategory[] }>(
    "/internal/support/categories",
  );
}

export function listSupportQueues() {
  return apiRequest<{ queues: SupportQueue[] }>("/internal/support/queues");
}

export function getSupportCodes() {
  return apiRequest<SupportCodes>("/internal/support/codes");
}

export function listQueuedChannels() {
  return apiRequest<{ channels: SupportChannel[] }>(
    "/internal/support/desk/queue",
  );
}

export function claimChannel(channelId: string) {
  return accion<{ channelId: string }>(
    `/internal/support/desk/channels/${channelId}/claim`,
    "support-claim-channel",
    {},
  );
}

export function setPresence(presenceState: string) {
  return accion<{ agentProfileId: string; presenceState: string }>(
    "/internal/support/desk/presence",
    "support-presence",
    { presenceState },
  );
}

export function listSupportAgents() {
  return apiRequest<{ agents: SupportAgentProfile[] }>(
    "/internal/support/desk/agents",
  );
}

export function createSupportAgent(body: CreateAgentInput) {
  return accion<{ agentProfileId: string; reactivated: boolean }>(
    "/internal/support/desk/agents",
    "support-create-agent",
    body,
  );
}

export function deactivateSupportAgent(agentProfileId: string) {
  return apiRequest<{ agentProfileId: string; isActive: boolean }>(
    `/internal/support/desk/agents/${agentProfileId}`,
    { method: "DELETE" },
  );
}

export function triageCase(caseId: string, body: TriageInput) {
  return accion<SupportCaseDetail>(
    `/internal/support/cases/${caseId}/triage`,
    "support-triage",
    body,
  );
}

/** Reclamar exige razón como cualquier otra asignación: quién se lo quedó y por qué. */
export function claimCase(caseId: string, body: AssignInput) {
  return accion<SupportCaseDetail>(
    `/internal/support/cases/${caseId}/claim`,
    "support-claim",
    body,
  );
}

export function transferCase(caseId: string, body: AssignInput) {
  return accion<SupportCaseDetail>(
    `/internal/support/cases/${caseId}/transfer`,
    "support-transfer",
    body,
  );
}

export function escalateCase(caseId: string, body: EscalateInput) {
  return accion<SupportCaseDetail>(
    `/internal/support/cases/${caseId}/escalate`,
    "support-escalate",
    body,
  );
}

export function addInternalNote(caseId: string, body: string) {
  return accion<{ messageId: string }>(
    `/internal/support/cases/${caseId}/notes`,
    "support-note",
    { body },
  );
}

export function resolveCase(caseId: string, body: ResolveInput) {
  return accion<SupportCaseDetail>(
    `/internal/support/cases/${caseId}/resolve`,
    "support-resolve",
    body,
  );
}

export function closeCase(caseId: string, body: CloseInput) {
  return accion<SupportCaseDetail>(
    `/internal/support/cases/${caseId}/close`,
    "support-close",
    body,
  );
}

export function readTranscript(
  channelId: string,
  query: QueryParams = {},
): Promise<SupportTranscript> {
  return apiRequest<SupportTranscript>(
    `/support/channels/${channelId}/messages`,
    { query },
  );
}

/**
 * El `clientMessageId` lo pone el cliente y no el servidor.
 *
 * Es lo que hace que reenviar tras un timeout no duplique el mensaje en la transcripción: el
 * backend lo usa para reconocer el reintento. Un identificador generado en el servidor no podría
 * hacerlo, porque el cliente no sabría cuál mandó.
 */
export function sendChannelMessage(channelId: string, body: string) {
  return apiRequest<{ messageId: string; sequence: string }>(
    `/support/channels/${channelId}/messages`,
    {
      method: "POST",
      body: {
        clientMessageId: idempotencyKey("agent-msg"),
        body,
        messageType: "TEXT",
      },
    },
  );
}

export function markChannelRead(channelId: string, upToSequence: string) {
  return apiRequest<unknown>(`/support/channels/${channelId}/read`, {
    method: "POST",
    body: { upToSequence },
  });
}

/**
 * El hilo en vivo, con `fetch` y no con `EventSource`.
 *
 * `EventSource` no admite cabeceras, y la sesión del portal viaja en `Authorization: Bearer`: no hay
 * forma de autenticar el stream con él sin poner el token en la URL, donde acabaría en los registros
 * del proxy. Con `fetch` el token va en su cabecera y el corte es un `AbortController`. Lo único que
 * se pierde es la reconexión automática del navegador, que aquí se escribe explícitamente y con
 * espera —sin la pausa, un backend caído recibiría un bucle de peticiones que le impediría
 * levantarse—. Es el mismo patrón que ya usa el ERP.
 *
 * Devuelve la función para cerrarlo, y quien la llama DEBE invocarla al desmontar: una suscripción
 * que sobrevive a la pantalla sigue recibiendo mensajes de una conversación que ya nadie mira, y
 * cada navegación deja otra abierta.
 */
export function subscribeToChannel(
  channelId: string,
  onEvent: (event: SupportLiveEvent) => void,
  onConnectionChange?: (connected: boolean) => void,
): () => void {
  return subscribeToServerEvents<SupportLiveEvent>(
    `/support/channels/${channelId}/stream`,
    onEvent,
    onConnectionChange,
  );
}
