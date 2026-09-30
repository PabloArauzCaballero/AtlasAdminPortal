"use client";

import { useState } from "react";
import { ChevronDown, LifeBuoy, Phone } from "lucide-react";
import { Piece, type PreviewDraft } from "./phone-preview";
import type { ContentSurface } from "./types";

/**
 * Cada superficie dentro del celular, maquetada como la pinta la app y no como una lista de textos.
 *
 * El celular enseñaba todas las piezas abiertas una debajo de otra, igual para cualquier pantalla.
 * En la app no es así: Preguntas frecuentes es una sola tarjeta con las preguntas PLEGADAS, debajo
 * de «¿Necesitas hablar con alguien?»; Ayuda son tarjetas con su botón; Inicio pone las piezas bajo
 * el saludo. Quien edita tiene que ver eso, o no sabe si su pregunta se entiende sólo con el título.
 * Los textos fijos (títulos de pantalla, la tarjeta de soporte) son los de
 * `AtlasFrontend/apps/consumer-app/app/(app)/ayuda.tsx` e `(tabs)/index.tsx`.
 */
export function PhoneScreen({
  surface,
  pieces,
  isDraft,
}: Readonly<{
  surface: ContentSurface;
  pieces: PreviewDraft[];
  isDraft: boolean;
}>) {
  const soloBorradorVacio =
    isDraft &&
    pieces.length === 1 &&
    !pieces[0].title.trim() &&
    !pieces[0].subtitle.trim() &&
    !pieces[0].body.trim() &&
    pieces[0].bullets.every((bullet) => !bullet.text.trim());
  if (soloBorradorVacio) return <Piece piece={pieces[0]} isDraft />;
  if (surface === "faq" && isDraft && !pieces[0]?.title.trim()) {
    return (
      <p
        className="rounded bg-amber-50 px-2 py-2 text-xs leading-5 text-amber-900"
        data-testid="phone-faq-sin-titulo"
      >
        Sin título la app no enseña la pregunta: escribe la pregunta en
        «Título».
      </p>
    );
  }
  if (surface === "faq" || surface === "help") {
    return (
      <HelpScreen
        faq={surface === "faq" ? pieces : []}
        help={surface === "help" ? pieces : []}
        isDraft={isDraft}
      />
    );
  }
  if (surface === "home" || surface === "profile" || surface === "credit") {
    return <CardsScreen surface={surface} pieces={pieces} isDraft={isDraft} />;
  }
  return (
    <>
      {pieces.map((piece, index) => (
        <Piece key={index} piece={piece} isDraft={isDraft} />
      ))}
    </>
  );
}

function AppCard({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {children}
    </div>
  );
}

function HelpScreen({
  faq,
  help,
  isDraft,
}: Readonly<{ faq: PreviewDraft[]; help: PreviewDraft[]; isDraft: boolean }>) {
  // En la app una pregunta sin título no se pinta: sería una flecha suelta que abre un párrafo.
  const preguntas = faq.filter((piece) => piece.title.trim());
  // Mientras se escribe, la pregunta se enseña ABIERTA: es lo que se está revisando.
  const [abierta, setAbierta] = useState<number | null>(isDraft ? 0 : null);

  return (
    <div className="flex flex-col gap-3" data-testid="phone-screen-help">
      <div>
        <p className="text-base font-semibold leading-snug text-atlas-text">
          Ayuda y preguntas frecuentes
        </p>
        <p className="text-xs text-atlas-muted">
          Lo que más nos preguntan, contestado en serio.
        </p>
      </div>

      <AppCard>
        <div className="flex items-start gap-2">
          <LifeBuoy className="mt-0.5 h-4 w-4 text-atlas-accent" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-atlas-text">
              ¿Necesitas hablar con alguien?
            </p>
            <p className="text-xs text-atlas-muted">
              Te respondemos por chat y queda registrado en tu caso.
            </p>
          </div>
        </div>
        <span className="mt-2 block rounded-full bg-atlas-accent px-4 py-2 text-center text-sm font-semibold text-white">
          Ir a soporte
        </span>
      </AppCard>

      {help.map((piece, index) => (
        <AppCard key={`help-${index}`}>
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 text-atlas-accent" aria-hidden />
            <Piece
              piece={{ ...piece, title: piece.title || "Hablar con Atlas" }}
              isDraft={isDraft}
            />
          </div>
        </AppCard>
      ))}

      {preguntas.length > 0 ? (
        <>
          <div>
            <p className="text-sm font-semibold text-atlas-text">
              Preguntas frecuentes
            </p>
            <p className="text-xs text-atlas-muted">
              Toca una para ver la respuesta.
            </p>
          </div>
          <AppCard>
            <ul className="divide-y divide-slate-100" data-testid="phone-faq">
              {preguntas.map((piece, index) => {
                const open = abierta === index;
                return (
                  <li key={`faq-${index}`} className="py-1">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-medium text-atlas-text"
                      aria-expanded={open}
                      onClick={() => setAbierta(open ? null : index)}
                    >
                      <span className="break-words">{piece.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-atlas-muted transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <div className="pb-2">
                        <Piece
                          piece={{ ...piece, title: "" }}
                          isDraft={isDraft}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </AppCard>
        </>
      ) : null}
    </div>
  );
}

const DONDE: Record<"home" | "profile" | "credit", string> = {
  home: "Tu línea Atlas",
  profile: "Tu perfil",
  credit: "Tu perfil · bajo el puntaje",
};

function CardsScreen({
  surface,
  pieces,
  isDraft,
}: Readonly<{
  surface: "home" | "profile" | "credit";
  pieces: PreviewDraft[];
  isDraft: boolean;
}>) {
  return (
    <div
      className="flex flex-col gap-3"
      data-testid={`phone-screen-${surface}`}
    >
      <div>
        {surface === "home" ? (
          <p className="text-xs text-atlas-muted">Hola</p>
        ) : null}
        <p className="text-base font-semibold leading-snug text-atlas-text">
          {DONDE[surface]}
        </p>
      </div>
      {pieces.map((piece, index) => (
        <AppCard key={index}>
          <Piece piece={piece} isDraft={isDraft} />
        </AppCard>
      ))}
    </div>
  );
}
