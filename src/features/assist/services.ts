import { z } from "zod";
import { apiRequest } from "@/shared/api/client";

/**
 * Atlas Assist en el portal de operaciones: las dos llamadas a Core.
 *
 * ## Por qué va a Core y no al servicio de IA
 *
 * El portal habla con Core por el mismo cliente de siempre —misma base `/api/v1`, mismo token,
 * mismo refresco, misma correlación—. La clave con la que Core llama al servicio de IA vive en el
 * servidor y la superficie (`admin-portal`) la decide Core a partir de la sesión: el cuerpo la
 * repite, pero no es lo que autoriza. Aquí no hay variables de entorno nuevas.
 *
 * ## `clientMessageId` es la llave del mensaje
 *
 * Se genera al enviar y SE CONSERVA al reintentar: el servidor guarda la respuesta bajo esa llave
 * y el reintento recoge la que ya había en vez de pagar otra llamada al modelo. Por eso no se manda
 * además `x-idempotency-key`: la deduplicación de esta ruta es la suya.
 */

export const ASSIST_SURFACE = "admin-portal";

/** Lo más que Core deja esperar al modelo (~28 s) más margen: con el plazo general se cortaba antes. */
export const ASSIST_TIMEOUT_MS = 40_000;

export type AssistReply = {
  reply: string;
  suggestHandoff: boolean;
  conversationId: string | null;
  turnId: string | null;
  /** `sin-ia`: la respuesta es el texto de la guía, sin pasar por el modelo. */
  mode?: string;
};

export type AssistTurn = {
  turnId: string;
  prompt: string;
  reply: string;
  suggestHandoff: boolean;
  createdAt: string;
};

export type AssistConversation = {
  conversationId: string | null;
  turns: AssistTurn[];
};

export type AskAssistInput = {
  prompt: string;
  clientMessageId: string;
  conversationId?: string;
  screen?: string;
};

export function askAssist(input: AskAssistInput): Promise<AssistReply> {
  return apiRequest<AssistReply>("/internal/assist/chat", {
    method: "POST",
    body: { surface: ASSIST_SURFACE, ...input },
    timeoutMs: ASSIST_TIMEOUT_MS,
  });
}

/** El hilo vigente, para rehidratar el panel al abrirlo. Vacío si nunca se preguntó nada. */
export function getAssistConversation(): Promise<AssistConversation> {
  return apiRequest<AssistConversation>("/internal/assist/conversation", {
    query: { surface: ASSIST_SURFACE },
  });
}

/** Una conversación de la lista del historial (la respuesta ya viene de la más reciente a la más antigua). */
const conversationSummarySchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().nullish(),
  updatedAt: z.string(),
  turnCount: z.number().int().nonnegative().catch(0),
});
const conversationListSchema = z.object({
  conversations: z.array(conversationSummarySchema),
});

export type AssistConversationSummary = z.infer<
  typeof conversationSummarySchema
>;

/** Las conversaciones de esta persona en este portal (Core devuelve las 30 más recientes). */
export async function listAssistConversations(): Promise<
  AssistConversationSummary[]
> {
  const list = await apiRequest("/internal/assist/conversations", {
    query: { surface: ASSIST_SURFACE },
    schema: conversationListSchema,
  });
  return list.conversations;
}

/** Una conversación del historial con todos sus turnos, para abrirla y seguirla. */
export function getAssistConversationById(
  conversationId: string,
): Promise<AssistConversation> {
  return apiRequest<AssistConversation>(
    `/internal/assist/conversations/${encodeURIComponent(conversationId)}`,
    { query: { surface: ASSIST_SURFACE } },
  );
}

/** Borra una conversación del historial. `deleted` es 0 si ya no existía. */
export function deleteAssistConversation(
  conversationId: string,
): Promise<{ deleted: number }> {
  return apiRequest<{ deleted: number }>(
    `/internal/assist/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE", query: { surface: ASSIST_SURFACE } },
  );
}
