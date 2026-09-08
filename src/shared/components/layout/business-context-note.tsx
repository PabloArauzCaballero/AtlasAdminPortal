"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";

/**
 * A short, plain-language note describing what this screen shows and how it is
 * meant to be used. Declarative on purpose ("Esta vista muestra…") so it reads
 * like documentation, not an AI justification.
 */
export function BusinessContextNote({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  return (
    /*
     * Ámbar era una señal falsa. El ámbar en este sistema significa advertencia, y esto es una
     * nota explicativa que aparece en TODAS las vistas: pintaba de color de aviso la franja más
     * ancha de la pantalla, justo debajo del título, en pantallas donde no pasa nada. Plegada es
     * ahora una línea tenue; sólo al abrirla se convierte en una superficie.
     */
    <div
      data-abierta={open}
      className="mb-5 overflow-hidden rounded-xl border border-transparent transition-colors data-[abierta=true]:border-atlas-border data-[abierta=true]:bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-atlas-soft"
      >
        <Lightbulb className="h-4 w-4 shrink-0 text-atlas-accent" aria-hidden />
        <span className="text-xs font-semibold text-atlas-muted">
          Notas de la vista
        </span>
        {/*
          El chevron sustituye a las palabras «Ver»/«Ocultar»: la dirección del
          icono ya dice si la nota está plegada, y el mismo gesto se lee igual
          aquí y en el explicador de la vista, que usa este mismo control.
        */}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-atlas-accent transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <p className="border-t border-atlas-border px-4 py-3 text-sm leading-6 text-atlas-text">
          {children}
        </p>
      ) : null}
    </div>
  );
}
