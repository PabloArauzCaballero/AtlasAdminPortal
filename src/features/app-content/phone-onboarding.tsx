"use client";

import { useEffect, useState } from "react";
import type { PreviewDraft } from "./phone-preview";
import {
  Ilustracion,
  ilustracionDe,
  type NombreIlustracion,
} from "./phone-ilustraciones";
import { ICONOS_PASO, PHONE } from "./phone-theme";
import { BrandButton } from "./phone-ui";

/** `eslogan` de la app (`bienvenida.tsx`): lo que dice la primera página, por defecto. */
const ESLOGAN = "Tu primer crédito no debería depender de un banco.";
const ESLOGAN_PIE = "Crédito para comprar en los comercios de Santa Cruz.";

/**
 * El primer paso de fábrica (`PASOS_POR_DEFECTO[0]` en `features/bienvenida-pasos.ts` de la app). La app lo
 * antepone SIEMPRE si el contenido no trae la pieza `que-es-atlas`: quien abre la app por primera vez lee primero
 * qué es Atlas y cómo funciona. La vista previa hace lo mismo, o mostraría una Bienvenida distinta de la real.
 */
const CLAVE_QUE_ES_ATLAS = "que-es-atlas";
const QUE_ES_ATLAS = {
  titulo: "Qué es Atlas",
  cuerpo:
    "Atlas te da crédito para comprar en los comercios de tu barrio, sin que un banco decida por ti. Pagas después, en cuotas mensuales, y cada pago a tiempo te acerca a más límite.",
} as const;

/** La «A» de la marca (`LETRA_A` de `ui/brand.tsx`), caras de luz y de sombra incluidas. */
function AtlasMark({ size = 112 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="pm-luz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PHONE.brand300} />
          <stop offset="1" stopColor={PHONE.brand400} />
        </linearGradient>
        <linearGradient id="pm-sombra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PHONE.brand500} />
          <stop offset="1" stopColor={PHONE.brand700} />
        </linearGradient>
        <linearGradient id="pm-trav" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={PHONE.brand400} />
          <stop offset="0.5" stopColor={PHONE.brand500} />
          <stop offset="1" stopColor={PHONE.brand700} />
        </linearGradient>
      </defs>
      <path d="M24 5 L24 21 L14 43 H5 Z" fill="url(#pm-luz)" />
      <path d="M24 5 L43 43 H34 L24 21 Z" fill="url(#pm-sombra)" />
      <path d="M17.5 31 H30.5 L34 38 H14 Z" fill="url(#pm-trav)" />
    </svg>
  );
}

type Pagina =
  | { tipo: "marca"; clave: string; titulo: string; pie: string }
  | {
      tipo: "paso";
      clave: string;
      titulo: string;
      cuerpo: string;
      icon: string;
      image?: string | null;
      ilustracion: NombreIlustracion;
    };

/**
 * La Bienvenida como la arma la app (`bienvenida.tsx`): página 0 con la marca y el eslogan, y UNA
 * página por paso. Mismo criterio de contenido: el cuerpo de un paso es el subtítulo, el texto o los
 * puntos unidos; el icono es el del primer punto que lo traiga, y si no el que la app pone por orden.
 * Un paso sin título o sin cuerpo no se pinta: media tarjeta se leería como un fallo.
 */
function paginasDe(pieces: PreviewDraft[], isDraft: boolean): Pagina[] {
  const marca = pieces.find((piece) => piece.contentKey === "eslogan");
  const pasos = pieces.filter((piece) => piece.contentKey !== "eslogan");
  const paginas: Pagina[] = [];
  if (marca || !isDraft) {
    paginas.push({
      tipo: "marca",
      clave: "eslogan",
      titulo: marca?.subtitle.trim() || ESLOGAN,
      pie: marca?.body.trim() || ESLOGAN_PIE,
    });
  }
  pasos.forEach((piece, index) => {
    const cuerpo =
      piece.subtitle.trim() ||
      piece.body.trim() ||
      piece.bullets.map((bullet) => bullet.text).join(" ");
    if (!piece.title.trim() || !cuerpo.trim()) return;
    const conIcono = piece.bullets.find(
      (bullet) => bullet.icon || bullet.iconImage,
    );
    paginas.push({
      tipo: "paso",
      clave: piece.contentKey ?? `paso-${index}`,
      titulo: piece.title,
      cuerpo,
      icon: conIcono?.icon ?? ICONOS_PASO[index] ?? "chispa",
      image: conIcono?.iconImage,
      ilustracion: ilustracionDe(piece.contentKey ?? "", index),
    });
  });
  return conQueEsAtlas(paginas, isDraft);
}

/**
 * «Qué es Atlas» primero entre los pasos, como en la app: si la pieza existe va la primera aunque se haya
 * publicado después; si no, se antepone la de fábrica. Sólo cuando hay algo que enseñar: una pieza en blanco
 * sigue mostrando el aviso «Completa el título y el texto», no una Bienvenida con un solo paso inventado.
 */
function conQueEsAtlas(paginas: Pagina[], isDraft: boolean): Pagina[] {
  const pasos = paginas.filter((pagina) => pagina.tipo === "paso");
  if (pasos.length === 0 && isDraft) return paginas;
  const existente = pasos.find((pagina) => pagina.clave === CLAVE_QUE_ES_ATLAS);
  const primero: Pagina = existente ?? {
    tipo: "paso",
    clave: CLAVE_QUE_ES_ATLAS,
    titulo: QUE_ES_ATLAS.titulo,
    cuerpo: QUE_ES_ATLAS.cuerpo,
    icon: "chispa",
    ilustracion: "que-es-atlas",
  };
  const marca = paginas.filter((pagina) => pagina.tipo === "marca");
  return [...marca, primero, ...pasos.filter((pagina) => pagina !== existente)];
}

export function OnboardingScreen({
  pieces,
  isDraft,
  focusKey,
}: Readonly<{ pieces: PreviewDraft[]; isDraft: boolean; focusKey?: string }>) {
  const paginas = paginasDe(pieces, isDraft);
  const enfocada = paginas.findIndex((pagina) => pagina.clave === focusKey);
  const [indice, setIndice] = useState(Math.max(0, enfocada));
  // Al editar una pieza, el carrusel salta a su página: es la que se está revisando.
  useEffect(() => {
    if (isDraft && enfocada >= 0) setIndice(enfocada);
  }, [isDraft, enfocada]);

  if (paginas.length === 0) {
    return (
      <p
        className="pt-24 text-center text-[15px] leading-[23px]"
        style={{ color: PHONE.text2 }}
        data-testid="phone-empty"
      >
        Completa el título y el texto del paso: sin los dos, la app no lo pinta.
      </p>
    );
  }

  const actual = paginas[Math.min(indice, paginas.length - 1)];
  const ultima = indice >= paginas.length - 1;

  return (
    <div
      className="-mt-8 flex flex-1 flex-col"
      style={{ minHeight: PHONE.height - 130 }}
      data-testid="phone-screen-onboarding"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-2 text-center">
        {actual.tipo === "marca" ? (
          <>
            <AtlasMark />
            <p
              className="text-[32px] font-black leading-[38px]"
              style={{ letterSpacing: "0.32em", paddingLeft: "0.32em" }}
            >
              ATLAS
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <p className="text-[25px] font-black leading-[31px] tracking-tight">
                {actual.titulo}
              </p>
              <p
                className="text-[15px] font-medium leading-[23px]"
                style={{ color: PHONE.text2 }}
              >
                {actual.pie}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* La ilustración de la app, no un icono en un círculo: es lo que verá la persona. */}
            <Ilustracion nombre={actual.ilustracion} ancho={280} />
            <p className="mt-2 text-[32px] font-black leading-[38px] tracking-tight">
              {actual.titulo}
            </p>
            <p
              className="text-[15px] font-medium leading-[23px]"
              style={{ color: PHONE.text2 }}
            >
              {actual.cuerpo}
            </p>
          </>
        )}
      </div>

      <div className="flex justify-center gap-2 py-4" aria-hidden>
        {paginas.map((_, posicion) => (
          <button
            key={posicion}
            type="button"
            tabIndex={-1}
            onClick={() => setIndice(posicion)}
            className="h-2 rounded-full transition-all"
            style={{
              width: posicion === indice ? 22 : 8,
              background:
                posicion === indice ? PHONE.brand400 : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIndice(Math.min(indice + 1, paginas.length - 1))}
          className="text-left"
          aria-label={ultima ? "Crear mi cuenta" : "Siguiente"}
        >
          <BrandButton label={ultima ? "Crear mi cuenta" : "Siguiente"} />
        </button>
        <span className="py-3 text-center text-[15px] font-bold">
          Ya tengo cuenta
        </span>
      </div>
    </div>
  );
}
