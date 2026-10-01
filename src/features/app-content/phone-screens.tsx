"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "./app-icons";
import { OnboardingScreen } from "./phone-onboarding";
import { Piece, type PreviewDraft } from "./phone-preview";
import { PHONE } from "./phone-theme";
import { AppCard, BrandButton } from "./phone-ui";
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
  focusKey,
}: Readonly<{
  surface: ContentSurface;
  pieces: PreviewDraft[];
  isDraft: boolean;
  focusKey?: string;
}>) {
  const soloBorradorVacio =
    isDraft &&
    pieces.length === 1 &&
    !pieces[0].title.trim() &&
    !pieces[0].subtitle.trim() &&
    !pieces[0].body.trim() &&
    pieces[0].bullets.every((bullet) => !bullet.text.trim());
  if (soloBorradorVacio) return <Piece piece={pieces[0]} isDraft />;
  if (surface === "onboarding") {
    return (
      <OnboardingScreen pieces={pieces} isDraft={isDraft} focusKey={focusKey} />
    );
  }
  if (surface === "faq" || surface === "help") {
    return (
      <HelpScreen
        faq={surface === "faq" ? pieces : []}
        help={surface === "help" ? pieces : []}
        isDraft={isDraft}
        focusKey={focusKey}
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

function HelpScreen({
  faq,
  help,
  isDraft,
  focusKey,
}: Readonly<{
  faq: PreviewDraft[];
  help: PreviewDraft[];
  isDraft: boolean;
  focusKey?: string;
}>) {
  // En la app una pregunta sin título no se pinta: sería una flecha suelta que abre un párrafo.
  const preguntas = faq.filter((piece) => piece.title.trim());
  // Mientras se escribe, la pregunta que se edita se enseña ABIERTA: es lo que se está revisando.
  const [abierta, setAbierta] = useState<string | null>(
    isDraft ? (focusKey ?? null) : null,
  );
  useEffect(() => {
    if (isDraft && focusKey) setAbierta(focusKey);
  }, [isDraft, focusKey]);

  return (
    <div className="flex flex-col gap-3" data-testid="phone-screen-help">
      <div>
        <p className="text-[25px] font-black leading-[31px] tracking-tight">
          Ayuda y preguntas frecuentes
        </p>
        <p
          className="mt-1 text-[15px] font-medium leading-[23px]"
          style={{ color: PHONE.text2 }}
        >
          Lo que más nos preguntan, contestado en serio.
        </p>
      </div>

      <AppCard>
        <div className="flex items-start gap-2">
          <AppIcon name="ayuda" size={22} tint={PHONE.brand400} />
          <div>
            <p className="text-[17px] font-bold leading-[23px]">
              ¿Necesitas hablar con alguien?
            </p>
            <p
              className="text-[13px] font-medium leading-[19px]"
              style={{ color: PHONE.text2 }}
            >
              Te respondemos por chat y queda registrado en tu caso.
            </p>
          </div>
        </div>
        <BrandButton label="Ir a soporte" style={{ marginTop: 12 }} />
      </AppCard>

      {help.map((piece, index) => (
        <AppCard key={`help-${index}`}>
          <div className="flex items-start gap-2">
            <AppIcon name="telefono" size={22} tint={PHONE.brand400} />
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
            <p className="text-[17px] font-bold leading-[23px]">
              Preguntas frecuentes
            </p>
            <p
              className="text-[13px] font-medium leading-[19px]"
              style={{ color: PHONE.text2 }}
            >
              Toca una para ver la respuesta.
            </p>
          </div>
          <AppCard>
            <ul className="divide-y divide-white/10" data-testid="phone-faq">
              {preguntas.map((piece, index) => {
                const clave = piece.contentKey ?? `faq-${index}`;
                const open = abierta === clave;
                return (
                  <li key={`faq-${index}`} className="py-1">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-3 text-left text-[15px] font-bold leading-5"
                      aria-expanded={open}
                      onClick={() => setAbierta(open ? null : clave)}
                    >
                      <span className="break-words">{piece.title}</span>
                      <span
                        aria-hidden
                        className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
                      >
                        <AppIcon name="adelante" size={18} tint={PHONE.text2} />
                      </span>
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
          <p className="text-[13px] font-medium" style={{ color: PHONE.text2 }}>
            Hola
          </p>
        ) : null}
        <p className="text-[25px] font-black leading-[31px] tracking-tight">
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
