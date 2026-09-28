"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Textarea } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";
import { ASSIST_DISABLED_MESSAGE } from "./assist-errors";
import { AssistBubbles } from "./assist-bubbles";
import { MAX_PROMPT_LENGTH, type AssistState } from "./use-assist";

/**
 * El panel del asistente: historial, campo y avisos.
 *
 * Se monta sobre `DialogShell`, así que hereda lo que ya cumple cualquier diálogo del portal: foco
 * dentro al abrir, foco atrapado, Escape cierra y el foco vuelve al botón que lo abrió. En pantallas
 * anchas es una tarjeta anclada abajo a la derecha; en el teléfono ocupa casi toda la pantalla.
 */
export function AssistPanel({
  open,
  onClose,
  screen,
  assist,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  screen: string;
  assist: AssistState;
}>) {
  const titleId = useId();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { bubbles, status, loadHistory, send, retry } = assist;
  const disabled = status.phase === "disabled";
  const busy = status.phase === "sending" || status.phase === "loading";

  useEffect(() => {
    if (open) void loadHistory();
  }, [open, loadHistory]);

  // La última burbuja siempre a la vista, también la del «Pensando…».
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [bubbles, status, open]);

  const submit = (text: string) => {
    if (disabled || busy) return;
    if (send(text, screen)) setDraft("");
  };

  return (
    <DialogShell
      open={open}
      labelledBy={titleId}
      onClose={onClose}
      // Es de consulta: tocar fuera cierra, y la conversación sigue ahí al volver.
      closeOnBackdrop
      overlayClassName="flex items-end justify-end p-2 sm:p-6"
      panelClassName="flex h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[420px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-atlas-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-atlas-accentSoft text-atlas-accent">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-atlas-text">
              Asistente de Atlas
            </h2>
            <p className="truncate text-xs text-atlas-muted">
              Estás en: {screen}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="h-8 w-8 px-0"
          onClick={onClose}
          aria-label="Cerrar asistente"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <p className="border-b border-atlas-border bg-atlas-accentWash px-4 py-2 text-xs text-atlas-text">
        No escribas contraseñas, códigos ni datos personales.
      </p>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
        className="atlas-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {status.phase === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-atlas-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando la conversación…
          </p>
        ) : null}

        <AssistBubbles
          bubbles={bubbles}
          showSuggestions={
            bubbles.length === 0 && status.phase !== "loading" && !disabled
          }
          suggestionsDisabled={busy}
          onSuggestion={submit}
        />

        {status.phase === "sending" ? (
          <p className="flex items-center gap-2 text-sm text-atlas-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Pensando…
          </p>
        ) : null}

        {disabled ? (
          <p className="rounded-xl border border-atlas-border bg-atlas-soft px-3 py-2 text-sm text-atlas-text">
            {ASSIST_DISABLED_MESSAGE}
          </p>
        ) : null}

        {status.phase === "error" ? (
          <div
            role="alert"
            className="space-y-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-atlas-critical"
          >
            <p>{status.message}</p>
            {status.canRetry ? (
              <Button
                variant="secondary"
                className="h-8"
                onClick={() => retry(screen)}
              >
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <form
        className="flex items-end gap-2 border-t border-atlas-border px-3 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter envía; Shift+Enter hace salto de línea; mientras se compone (IME) no se envía.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit(draft);
            }
          }}
          maxLength={MAX_PROMPT_LENGTH}
          rows={2}
          disabled={disabled}
          aria-label="Tu pregunta para el asistente"
          placeholder={
            disabled ? "El asistente está apagado" : "Escribe tu pregunta…"
          }
          className={cn("max-h-40 min-h-0 flex-1 resize-none py-2")}
        />
        <Button
          type="submit"
          variant="primary"
          className="h-10 w-10 px-0"
          disabled={disabled || busy || !draft.trim()}
          aria-label="Enviar pregunta"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </DialogShell>
  );
}
