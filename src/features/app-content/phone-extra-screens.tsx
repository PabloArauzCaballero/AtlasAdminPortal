"use client";

import { AppIcon } from "./app-icons";
import type { PreviewDraft } from "./phone-preview";
import { PHONE } from "./phone-theme";
import { AppCard, IconChip } from "./phone-ui";

const TEXTO2 = { color: PHONE.text2 } as const;

function Titulo({
  children,
  sub,
}: Readonly<{ children: React.ReactNode; sub?: string }>) {
  return (
    <div>
      <p className="text-[25px] font-black leading-[31px] tracking-tight">
        {children}
      </p>
      {sub ? (
        <p
          className="mt-1 text-[15px] font-medium leading-[23px]"
          style={TEXTO2}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/** El recorrido de Inicio: una tarjeta por paso, con el icono del paso (`metadata.icon`). */
export function TourScreen({ pieces }: Readonly<{ pieces: PreviewDraft[] }>) {
  return (
    <div className="flex flex-col gap-3" data-testid="phone-screen-tour">
      <Titulo sub="Se lanza la primera vez que entras a Inicio y desde Ayuda.">
        Recorrido guiado
      </Titulo>
      {pieces.map((piece, index) => (
        <AppCard key={piece.contentKey ?? index}>
          <div className="flex items-start gap-3">
            <IconChip name={piece.icon ?? "chispa"} />
            <div className="min-w-0">
              <p className="text-[17px] font-bold leading-[23px]">
                {piece.title || "Sin título"}
              </p>
              <p
                className="mt-1 text-[15px] font-medium leading-[23px]"
                style={TEXTO2}
              >
                {piece.body || piece.subtitle}
              </p>
            </div>
          </div>
        </AppCard>
      ))}
    </div>
  );
}

/** «Tus datos»: la cabecera, los permisos, los derechos que se pueden pedir y los avisos. */
export function PrivacyScreen({
  pieces,
}: Readonly<{ pieces: PreviewDraft[] }>) {
  const por = (clave: string) =>
    pieces.find((piece) => piece.contentKey === clave);
  const cabecera = por("cabecera");
  const derechos = pieces.filter((piece) =>
    piece.contentKey?.startsWith("derecho."),
  );
  const avisos = pieces.filter(
    (piece) =>
      piece.contentKey?.includes(".guardado.") ||
      piece.contentKey === "solicitud.enviada",
  );
  const tarjeta = (clave: string) => {
    const piece = por(clave);
    if (!piece) return null;
    return (
      <>
        <p className="text-[17px] font-bold leading-[23px]">{piece.title}</p>
        <p
          className="mt-1 text-[13px] font-medium leading-[19px]"
          style={TEXTO2}
        >
          {piece.body}
        </p>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-3" data-testid="phone-screen-privacy">
      <Titulo sub={cabecera?.subtitle}>{cabecera?.title || "Tus datos"}</Titulo>
      <AppCard>{tarjeta("permisos")}</AppCard>
      <AppCard>
        {tarjeta("derechos")}
        <ul className="mt-3 flex flex-col gap-2">
          {derechos.map((piece) => (
            <li
              key={piece.contentKey}
              className="rounded-xl px-3 py-2"
              style={{ border: `1px solid ${PHONE.line}` }}
            >
              <p className="text-[15px] font-bold leading-5">{piece.title}</p>
              <p
                className="text-[13px] font-medium leading-[19px]"
                style={TEXTO2}
              >
                {piece.subtitle}
              </p>
            </li>
          ))}
        </ul>
      </AppCard>
      {avisos.map((piece) => (
        <p
          key={piece.contentKey}
          className="rounded-xl px-3 py-2 text-[13px] leading-[19px]"
          style={{ background: PHONE.successSoft, color: PHONE.text1 }}
        >
          <span
            className="mb-0.5 block text-[11px] font-bold uppercase tracking-wider"
            style={{ color: PHONE.brand400 }}
          >
            Aviso · {piece.contentKey}
          </span>
          {piece.body}
        </p>
      ))}
    </div>
  );
}

const GRUPOS: Record<string, string> = {
  extracto: "Subir el extracto",
  registro: "Crear tu cuenta",
  economia: "Tu situación económica",
  domicilio: "Tu domicilio",
  identidad: "Tu identidad",
  referencias: "Tus referencias",
};

/**
 * «Por qué te pedimos esto», como la tarjeta de la app (`ui/trust-card.tsx`): una por pantalla del alta,
 * con una fila por dato —icono, dato, para qué— y las garantías como etiquetas.
 */
export function SignupScreen({ pieces }: Readonly<{ pieces: PreviewDraft[] }>) {
  const grupos = new Map<string, PreviewDraft[]>();
  for (const piece of pieces) {
    const grupo = (piece.contentKey ?? "otros").split(".")[0];
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), piece]);
  }
  return (
    <div className="flex flex-col gap-4" data-testid="phone-screen-signup">
      {[...grupos.entries()].map(([grupo, items]) => (
        <section key={grupo} className="flex flex-col gap-2">
          <p
            className="text-[13px] font-bold uppercase tracking-wider"
            style={{ color: PHONE.text3 }}
          >
            {GRUPOS[grupo] ?? grupo}
          </p>
          <div
            className="rounded-2xl p-px"
            style={{
              background: `linear-gradient(135deg, ${PHONE.brand500}, ${PHONE.brand400}, ${PHONE.brand700})`,
            }}
          >
            <div
              className="rounded-[15px] p-4"
              style={{ background: "#0B2138" }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(20,168,148,0.16)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <AppIcon name="escudo" size={20} tint={PHONE.brand400} />
                </span>
                <div>
                  <p className="text-[17px] font-bold leading-[23px]">
                    Por qué te pedimos esto
                  </p>
                  <p
                    className="text-[13px] font-medium leading-[19px]"
                    style={TEXTO2}
                  >
                    Y qué hacemos para que esté a salvo.
                  </p>
                </div>
              </div>
              <ul className="flex flex-col">
                {items.map((piece, index) => (
                  <li
                    key={piece.contentKey ?? index}
                    className="flex flex-col gap-1 py-2"
                    style={
                      index > 0
                        ? { borderTop: "1px solid rgba(255,255,255,0.20)" }
                        : undefined
                    }
                  >
                    <div className="flex min-h-9 items-center gap-2">
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: "rgba(43,224,168,0.06)" }}
                      >
                        <AppIcon
                          name={piece.icon ?? "check"}
                          size={16}
                          tint={PHONE.brand400}
                        />
                      </span>
                      <p className="text-[15px] font-medium leading-[23px]">
                        {piece.title || "Sin dato"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 pl-9">
                      <p
                        className="text-[13px] font-medium leading-[19px]"
                        style={TEXTO2}
                      >
                        {piece.body}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {piece.bullets
                          .filter((garantia) => garantia.text.trim())
                          .map((garantia, k) => (
                            <span
                              key={k}
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold"
                              style={{ background: PHONE.bg }}
                            >
                              <AppIcon
                                name={garantia.icon ?? "check"}
                                size={12}
                                tint={PHONE.brand400}
                              />
                              {garantia.text}
                            </span>
                          ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
