"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { contarMensajes, formatRelativa } from "./relative-time";
import type { AssistConversationSummary } from "./services";
import { HISTORY_LIST_ERROR } from "./use-assist-history";
import type { AssistState } from "./use-assist";

/**
 * La vista «Historial de conversaciones» dentro del panel: una lista con título, fecha y cantidad
 * de mensajes. Tocar una conversación la abre para seguirla; borrar pide confirmación EN LA FILA
 * (sin cuadros del navegador) para no perder un hilo por un toque de más.
 */
export function AssistHistory({
  assist,
  onBack,
  onOpened,
}: Readonly<{
  assist: AssistState;
  /** «Volver al chat». */
  onBack: () => void;
  /** Se abrió una conversación: el panel vuelve al chat con ese hilo. */
  onOpened: () => void;
}>) {
  const { historial, status } = assist;
  const { history, busyId, notice, loadList, openConversation } = historial;
  const [confirming, setConfirming] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Con una pregunta en curso no se cambia de hilo ni se borra el vigente.
  const sending = status.phase === "sending";

  useEffect(() => {
    void loadList();
    rootRef.current?.querySelector("button")?.focus();
  }, [loadList]);

  const open = async (id: string) => {
    if (await openConversation(id)) onOpened();
  };

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-atlas-border px-4 py-2">
        <h3 className="text-sm font-semibold text-atlas-text">
          Historial de conversaciones
        </h3>
        <Button
          variant="ghost"
          className="h-8"
          onClick={onBack}
          aria-label="Volver al chat"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al chat
        </Button>
      </div>

      <div className="atlas-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {notice ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-atlas-critical"
          >
            {notice}
          </p>
        ) : null}

        {history.phase === "loading" && history.items.length === 0 ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-atlas-muted"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando tus conversaciones…
          </p>
        ) : null}

        {history.phase === "error" ? (
          <div
            role="alert"
            className="space-y-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-atlas-critical"
          >
            <p>{HISTORY_LIST_ERROR}</p>
            <Button
              variant="secondary"
              className="h-8"
              onClick={() => void loadList()}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {history.phase === "ready" && history.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-atlas-border px-3 py-6 text-center text-sm text-atlas-muted">
            Todavía no tienes conversaciones guardadas. Haz una pregunta y
            aparecerá aquí.
          </p>
        ) : null}

        <ul className="space-y-2">
          {history.items.map((item) => (
            <HistoryRow
              key={item.conversationId}
              item={item}
              current={item.conversationId === assist.activeId}
              busy={busyId === item.conversationId}
              blocked={busyId !== null || sending}
              confirming={confirming === item.conversationId}
              onOpen={() => void open(item.conversationId)}
              onAskDelete={() => setConfirming(item.conversationId)}
              onCancel={() => setConfirming(null)}
              onDelete={async () => {
                await historial.deleteConversation(item.conversationId);
                setConfirming(null);
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function HistoryRow({
  item,
  current,
  busy,
  blocked,
  confirming,
  onOpen,
  onAskDelete,
  onCancel,
  onDelete,
}: Readonly<{
  item: AssistConversationSummary;
  current: boolean;
  busy: boolean;
  blocked: boolean;
  confirming: boolean;
  onOpen: () => void;
  onAskDelete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}>) {
  const title = item.title?.trim() || "Conversación sin título";
  const meta = [formatRelativa(item.updatedAt), contarMensajes(item.turnCount)]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className={cn(
        "rounded-xl border bg-atlas-card",
        current ? "border-atlas-accent" : "border-atlas-border",
      )}
    >
      {confirming ? (
        <div
          role="group"
          aria-label={`Borrar «${title}»`}
          className="space-y-2 px-3 py-2.5"
        >
          <p className="text-sm text-atlas-text">
            ¿Borrar «{title}»? No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="h-8"
              onClick={onDelete}
              isLoading={busy}
              disabled={blocked}
            >
              Sí, borrar
            </Button>
            <Button variant="secondary" className="h-8" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={onOpen}
            disabled={blocked}
            aria-current={current ? "true" : undefined}
            className="atlas-press min-w-0 flex-1 rounded-l-xl px-3 py-2.5 text-left hover:bg-atlas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="block truncate text-sm font-medium text-atlas-text">
              {title}
            </span>
            <span className="block text-xs text-atlas-muted">
              {busy ? "Abriendo…" : meta}
            </span>
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            disabled={blocked}
            aria-label={`Borrar la conversación «${title}»`}
            className="atlas-press flex w-11 shrink-0 items-center justify-center rounded-r-xl text-atlas-muted hover:bg-red-50 hover:text-atlas-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}
