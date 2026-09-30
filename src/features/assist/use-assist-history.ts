"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  deleteAssistConversation,
  getAssistConversationById,
  listAssistConversations,
  type AssistConversation,
  type AssistConversationSummary,
} from "./services";

/**
 * El historial de conversaciones del panel: la lista, abrir una para seguirla y borrarla.
 *
 * ## Un fallo de la lista no bloquea el chat
 *
 * Este estado es aparte del estado del hilo (`AssistStatus`): si la lista no carga, el panel lo
 * dice DENTRO de la vista «Historial» y el campo de pregunta sigue funcionando.
 */

export type HistoryState =
  | { phase: "idle"; items: AssistConversationSummary[] }
  | { phase: "loading"; items: AssistConversationSummary[] }
  | { phase: "ready"; items: AssistConversationSummary[] }
  | { phase: "error"; items: AssistConversationSummary[] };

export const HISTORY_LIST_ERROR =
  "No se pudo cargar el historial. Puedes seguir preguntando y volver a intentarlo en un momento.";
export const HISTORY_OPEN_ERROR =
  "No se pudo abrir esa conversación. Intenta de nuevo.";
export const HISTORY_GONE_ERROR = "Esa conversación ya no existe.";
export const HISTORY_DELETE_ERROR =
  "No se pudo borrar la conversación. Intenta de nuevo.";

type Deps = {
  activeId: string | null;
  /** Hay una pregunta al modelo en curso: no se cambia de hilo debajo de ella. */
  inFlight: RefObject<boolean>;
  mounted: RefObject<boolean>;
  /** Pone el hilo de una conversación abierta como el hilo vigente. */
  applyThread: (thread: AssistConversation) => void;
  /** Vacía el hilo vigente (se borró la conversación que estaba abierta). */
  reset: () => void;
};

export function useAssistHistory({
  activeId,
  inFlight,
  mounted,
  applyThread,
  reset,
}: Deps) {
  const [history, setHistory] = useState<HistoryState>({
    phase: "idle",
    items: [],
  });
  /** Qué conversación se está abriendo o borrando (para deshabilitar su fila). */
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Aviso de la última acción sobre una fila (abrir o borrar). */
  const [notice, setNotice] = useState<string | null>(null);
  const openToken = useRef(0);

  const loadList = useCallback(async () => {
    setHistory((current) => ({ phase: "loading", items: current.items }));
    setNotice(null);
    try {
      const items = await listAssistConversations();
      if (mounted.current) setHistory({ phase: "ready", items });
    } catch {
      if (mounted.current)
        setHistory((current) => ({ phase: "error", items: current.items }));
    }
  }, [mounted]);

  const quitar = useCallback((id: string) => {
    setHistory((current) => ({
      ...current,
      items: current.items.filter((item) => item.conversationId !== id),
    }));
  }, []);

  /** Abre una conversación para continuarla. `true` si el hilo cambió (el panel vuelve al chat). */
  const openConversation = useCallback(
    async (id: string): Promise<boolean> => {
      if (inFlight.current) return false;
      const token = ++openToken.current;
      setBusyId(id);
      setNotice(null);
      try {
        const thread = await getAssistConversationById(id);
        if (!mounted.current || token !== openToken.current) return false;
        applyThread({ ...thread, conversationId: thread.conversationId ?? id });
        return true;
      } catch (error) {
        if (!mounted.current || token !== openToken.current) return false;
        if (isAtlasApiError(error) && error.status === 404) {
          quitar(id);
          setNotice(HISTORY_GONE_ERROR);
        } else setNotice(HISTORY_OPEN_ERROR);
        return false;
      } finally {
        if (mounted.current && token === openToken.current) setBusyId(null);
      }
    },
    [applyThread, inFlight, mounted, quitar],
  );

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      setBusyId(id);
      setNotice(null);
      try {
        await deleteAssistConversation(id);
        if (!mounted.current) return true;
        quitar(id);
        if (id === activeId) reset();
        return true;
      } catch {
        if (mounted.current) setNotice(HISTORY_DELETE_ERROR);
        return false;
      } finally {
        if (mounted.current) setBusyId(null);
      }
    },
    [activeId, mounted, quitar, reset],
  );

  return {
    history,
    busyId,
    notice,
    loadList,
    openConversation,
    deleteConversation,
  };
}
