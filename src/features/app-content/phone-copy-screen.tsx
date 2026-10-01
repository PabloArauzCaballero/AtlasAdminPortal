"use client";

import type { PreviewDraft } from "./phone-preview";
import { PHONE } from "./phone-theme";
import { AppCard } from "./phone-ui";

const TEXTO2 = { color: PHONE.text2 } as const;

/**
 * Los textos sueltos, agrupados por pantalla. Cada uno enseña DÓNDE sale (`metadata.donde`) y cómo se
 * lee: no se puede maquetar cada frase en su contexto real (son quince lugares distintos), pero sí decir
 * cuál es y con qué letra se pinta, que es lo que hace falta para editarla sin equivocarse de sitio.
 */
export function CopyScreen({ pieces }: Readonly<{ pieces: PreviewDraft[] }>) {
  const grupos = new Map<string, PreviewDraft[]>();
  for (const piece of pieces) {
    const pantalla =
      piece.meta?.pantalla ??
      (piece.contentKey ?? "otros").split(".")[0] ??
      "otros";
    grupos.set(pantalla, [...(grupos.get(pantalla) ?? []), piece]);
  }
  return (
    <div className="flex flex-col gap-4" data-testid="phone-screen-copy">
      <div>
        <p className="text-[25px] font-black leading-[31px] tracking-tight">
          Textos de pantallas
        </p>
        <p
          className="mt-1 text-[15px] font-medium leading-[23px]"
          style={TEXTO2}
        >
          Frases sueltas de la app. Cada una dice dónde sale.
        </p>
      </div>
      {[...grupos.entries()].map(([pantalla, items]) => (
        <section key={pantalla} className="flex flex-col gap-2">
          <p
            className="text-[13px] font-bold uppercase tracking-wider"
            style={{ color: PHONE.text3 }}
          >
            {pantalla}
          </p>
          {items.map((piece, index) => (
            <AppCard key={piece.contentKey ?? index}>
              {piece.meta?.donde ? (
                <p
                  className="mb-1.5 text-[11px] font-medium leading-4"
                  style={{ color: PHONE.brand400 }}
                >
                  {piece.meta.donde}
                </p>
              ) : null}
              {piece.title ? (
                <p className="text-[17px] font-bold leading-[23px]">
                  {piece.title}
                </p>
              ) : null}
              <p
                className="text-[15px] font-medium leading-[23px]"
                style={TEXTO2}
              >
                {piece.body || "Sin texto: la app usa el de fábrica."}
              </p>
            </AppCard>
          ))}
        </section>
      ))}
    </div>
  );
}
