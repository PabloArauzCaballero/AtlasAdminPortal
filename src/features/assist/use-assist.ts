"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeAssistFailure,
  isAssistDisabled,
  isAssistInFlight,
} from "./assist-errors";
import {
  askAssist,
  getAssistConversation,
  type AssistConversation,
} from "./services";
import { useAssistHistory } from "./use-assist-history";

/**
 * El estado del asistente, del lado de la pantalla.
 *
 * ## La llave vive aquí
 *
 * `clientMessageId` se genera al enviar y SE CONSERVA mientras ese mensaje no tenga respuesta: el
 * reintento —el silencioso del 409 o el del botón «Reintentar»— viaja con la misma llave y recoge
 * la respuesta que el servidor ya guardó. Nunca se paga dos veces la misma pregunta.
 *
 * ## El 404 no esconde el botón
 *
 * En la app del cliente el 404 apaga el botón. Aquí no: el equipo pidió verlo en todos los
 * portales, y un botón que desaparece sin explicación se lee como «no existe». El panel dice que
 * está apagado en este ambiente y deja el campo deshabilitado.
 */

/** Cuántas veces se insiste en silencio ante «la misma consulta sigue en curso» (409). */
export const IN_FLIGHT_RETRIES = 3;
/** La espera cuando el servidor no dice cuánto (o el navegador no deja leer `Retry-After`). */
export const IN_FLIGHT_WAIT_MS = 2_000;
export const MAX_PROMPT_LENGTH = 2_000;

export type AssistBubble = {
  id: string;
  role: "persona" | "asistente";
  text: string;
  suggestHandoff?: boolean;
  sinIa?: boolean;
};

export type AssistStatus =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "sending" }
  | { phase: "disabled" }
  | { phase: "error"; message: string; canRetry: boolean };

type Pending = { text: string; clientMessageId: string };

/** UUID v4: es lo que valida Core. `randomUUID` falta en contextos no seguros (http de la red local). */
export function newClientMessageId(): string {
  const webcrypto = globalThis.crypto;
  if (webcrypto?.randomUUID) return webcrypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (webcrypto?.getRandomValues) webcrypto.getRandomValues(bytes);
  else
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

/** Cada turno del servidor son dos burbujas: la pregunta y la respuesta. */
function turnsToBubbles(thread: AssistConversation | null): AssistBubble[] {
  return (thread?.turns ?? []).flatMap((turn) => [
    { id: `${turn.turnId}-p`, role: "persona" as const, text: turn.prompt },
    {
      id: turn.turnId,
      role: "asistente" as const,
      text: turn.reply,
      suggestHandoff: turn.suggestHandoff,
    },
  ]);
}

const esperar = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * El hilo con el asistente. Vive en el marco del portal —no en la vista— para que sobreviva a la
 * navegación: se cierra el panel, se cambia de pantalla y la conversación sigue ahí.
 */
export function useAssist() {
  const [bubbles, setBubbles] = useState<AssistBubble[]>([]);
  const [status, setStatus] = useState<AssistStatus>({ phase: "idle" });
  const conversationId = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pending = useRef<Pending | null>(null);
  const inFlight = useRef(false);
  const loaded = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Rehidrata el hilo la primera vez que se abre el panel. Un fallo que no es 404 no impide preguntar. */
  const loadHistory = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    setStatus({ phase: "loading" });
    try {
      const thread = await getAssistConversation();
      if (!mounted.current) return;
      conversationId.current = thread?.conversationId ?? null;
      setActiveId(conversationId.current);
      setBubbles(turnsToBubbles(thread));
      setStatus({ phase: "ready" });
    } catch (error) {
      if (!mounted.current) return;
      if (isAssistDisabled(error)) {
        setStatus({ phase: "disabled" });
        return;
      }
      setStatus({ phase: "ready" });
    }
  }, []);

  const ask = useCallback(
    async (text: string, screen: string, clientMessageId: string) => {
      inFlight.current = true;
      setStatus({ phase: "sending" });
      let attempts = 0;
      for (;;) {
        try {
          const answer = await askAssist({
            prompt: text,
            clientMessageId,
            ...(conversationId.current
              ? { conversationId: conversationId.current }
              : {}),
            ...(screen ? { screen } : {}),
          });
          inFlight.current = false;
          pending.current = null;
          if (!mounted.current) return;
          conversationId.current =
            answer.conversationId ?? conversationId.current;
          setActiveId(conversationId.current);
          setBubbles((current) => [
            ...current,
            {
              // Con sufijo propio: sin `turnId` la clave no puede chocar con la de la pregunta.
              id: answer.turnId ?? `local-r-${clientMessageId}`,
              role: "asistente",
              text: answer.reply,
              suggestHandoff: answer.suggestHandoff,
              sinIa: answer.mode === "sin-ia",
            },
          ]);
          setStatus({ phase: "ready" });
          return;
        } catch (error) {
          if (isAssistInFlight(error) && attempts < IN_FLIGHT_RETRIES) {
            attempts += 1;
            const retryAfter = (error as { retryAfterMs?: number })
              .retryAfterMs;
            await esperar(retryAfter ?? IN_FLIGHT_WAIT_MS);
            continue;
          }
          inFlight.current = false;
          if (!mounted.current) return;
          if (isAssistDisabled(error)) {
            pending.current = null;
            setStatus({ phase: "disabled" });
            return;
          }
          const failure = describeAssistFailure(error);
          if (!failure.reintentable) pending.current = null;
          setStatus({
            phase: "error",
            message: failure.mensaje,
            canRetry: failure.reintentable,
          });
          return;
        }
      }
    },
    [],
  );

  /** Envía una pregunta nueva: la burbuja propia aparece al instante y la llave queda guardada. */
  const send = useCallback(
    (raw: string, screen: string): boolean => {
      const text = raw.trim().slice(0, MAX_PROMPT_LENGTH);
      if (!text || inFlight.current) return false;
      const clientMessageId = newClientMessageId();
      pending.current = { text, clientMessageId };
      setBubbles((current) => [
        ...current,
        { id: `local-${clientMessageId}`, role: "persona", text },
      ]);
      void ask(text, screen, clientMessageId);
      return true;
    },
    [ask],
  );

  /** Repite el último mensaje con LA MISMA llave: recoge la respuesta guardada, no genera otra. */
  const retry = useCallback(
    (screen: string) => {
      const previous = pending.current;
      if (!previous || inFlight.current) return;
      void ask(previous.text, screen, previous.clientMessageId);
    },
    [ask],
  );

  /** Deja el hilo en blanco: la próxima pregunta abre una conversación NUEVA. No llama al servidor. */
  const reset = useCallback(() => {
    conversationId.current = null;
    pending.current = null;
    setActiveId(null);
    setBubbles([]);
    setStatus((current) =>
      current.phase === "disabled" ? current : { phase: "ready" },
    );
  }, []);

  const applyThread = useCallback((thread: AssistConversation) => {
    conversationId.current = thread.conversationId;
    pending.current = null;
    setActiveId(thread.conversationId);
    setBubbles(turnsToBubbles(thread));
    setStatus({ phase: "ready" });
  }, []);

  /** «Nueva conversación»: no hace nada mientras hay una pregunta en curso. */
  const nuevaConversacion = useCallback((): boolean => {
    if (inFlight.current) return false;
    reset();
    return true;
  }, [reset]);

  const historial = useAssistHistory({
    activeId,
    inFlight,
    mounted,
    applyThread,
    reset,
  });

  return {
    bubbles,
    status,
    loadHistory,
    send,
    retry,
    nuevaConversacion,
    historial,
    activeId,
  };
}

export type AssistState = ReturnType<typeof useAssist>;
