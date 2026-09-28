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
