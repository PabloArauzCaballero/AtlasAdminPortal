"use client";

import { cn } from "@/shared/lib/cn";
import type { AssistBubble } from "./use-assist";

/** Temas que el asistente SÍ sabe contestar: la primera pantalla no es un campo en blanco. */
export const SUGGESTED_QUESTIONS = [
  "¿Cómo atiendo un caso de soporte?",
  "¿Qué hay en la cola de trabajo?",
  "¿Por qué no veo un menú?",
] as const;

/**
 * Las burbujas del hilo y, con el hilo vacío, las preguntas sugeridas.
 *
 * Si el asistente sugiere derivar (`suggestHandoff`), aquí no se añade nada: el portal interno no
 * tiene un canal de ayuda propio al que mandar a nadie, y un enlace a la bandeja de soporte —que es
 * la de los clientes— confundiría. La respuesta ya dice a quién acudir.
 */
export function AssistBubbles({
  bubbles,
  showSuggestions,
  suggestionsDisabled,
  onSuggestion,
}: Readonly<{
  bubbles: readonly AssistBubble[];
  showSuggestions: boolean;
  suggestionsDisabled: boolean;
  onSuggestion: (question: string) => void;
}>) {
  return (
    <>
      {showSuggestions ? (
        <div className="space-y-3">
          <p className="text-sm text-atlas-text">
            Pregúntame cómo hacer algo en el portal de operaciones: dónde está
            una pantalla, qué significa un estado o qué pasos sigue una tarea.
          </p>
          <div className="flex flex-col items-start gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSuggestion(question)}
                disabled={suggestionsDisabled}
                className="atlas-press rounded-full border border-atlas-border bg-white px-3 py-1.5 text-left text-xs text-atlas-text hover:bg-atlas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 disabled:cursor-not-allowed"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={cn(
            "flex flex-col",
            bubble.role === "persona" ? "items-end" : "items-start",
          )}
        >
          <p
            className={cn(
              "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6",
              bubble.role === "persona"
                ? "rounded-br-md bg-slate-900 text-white"
                : "rounded-bl-md bg-atlas-soft text-atlas-text",
            )}
          >
            {bubble.text}
          </p>
          {bubble.sinIa ? (
            <span className="mt-1 text-[11px] text-atlas-muted">
              Respuesta sin IA: texto de la guía.
            </span>
          ) : null}
        </div>
      ))}
    </>
  );
}
