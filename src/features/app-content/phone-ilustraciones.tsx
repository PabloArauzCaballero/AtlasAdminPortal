/**
 * Las ilustraciones de la Bienvenida en la vista previa del portal.
 *
 * Son el MISMO dibujo que en la app (`ui/ilustraciones-bienvenida.tsx`, con `react-native-svg`), escrito aquí con
 * SVG de navegador: las coordenadas y los colores son idénticos, sólo cambian los nombres de las etiquetas. Existe
 * para que lo que se ve al editar «Contenido de la app» sea lo que verá la persona en el teléfono, y no una
 * aproximación con un icono dentro de un círculo.
 *
 * Si se cambia un dibujo en la app, se cambia aquí: la prueba `app-content-phone-onboarding` comprueba que existen
 * los mismos cuatro nombres.
 */

import { EscaneasYListo, ConstruyesHistorial } from "./phone-ilustraciones-2";
import { C, Defs } from "./phone-ilustraciones-base";

export type NombreIlustracion =
  | "que-es-atlas"
  | "escaneas-y-listo"
  | "pagas-en-cuotas"
  | "construyes-historial";

/** Qué dibujo lleva cada paso: la clave que conoce la app, y si el portal inventa otra, su posición. */
const POR_CLAVE: Record<string, NombreIlustracion> = {
  "que-es-atlas": "que-es-atlas",
  "paso-1": "escaneas-y-listo",
  "paso-2": "pagas-en-cuotas",
  "paso-3": "construyes-historial",
};
const POR_POSICION: NombreIlustracion[] = [
  "que-es-atlas",
  "escaneas-y-listo",
  "pagas-en-cuotas",
  "construyes-historial",
];

export function ilustracionDe(
  clave: string,
  posicion: number,
): NombreIlustracion {
  return (
    POR_CLAVE[clave] ??
    POR_POSICION[Math.min(posicion, POR_POSICION.length - 1)]
  );
}

function QueEsAtlas() {
  const id = "pi-qa";
  return (
    <>
      <Defs id={id} />
      <rect
        x={70}
        y={96}
        width={140}
        height={90}
        rx={8}
        fill={C.card}
        stroke={C.edge}
        strokeWidth={2}
      />
      <rect x={128} y={130} width={26} height={56} rx={4} fill={C.navy} />
      <rect x={84} y={118} width={34} height={30} rx={4} fill={C.navy} />
      <rect x={164} y={118} width={34} height={30} rx={4} fill={C.navy} />
      <path d="M62 96 L78 62 H202 L218 96 Z" fill={`url(#${id}-marca)`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${78 + i * 25 + 12.5} 62 L${70 + i * 28 + 14} 96`}
          stroke={C.b900}
          strokeWidth={3}
          opacity={0.35}
        />
      ))}
      <path
        d="M62 96 q9 14 18 0 q9 14 18 0 q9 14 18 0 q9 14 18 0 q9 14 18 0 q9 14 18 0 q9 14 18 0 q9 14 18 0 Z"
        fill={C.b500}
      />
      <rect
        x={206}
        y={104}
        width={52}
        height={88}
        rx={10}
        fill={C.navy}
        stroke={C.b400}
        strokeWidth={3}
      />
      <circle cx={232} cy={140} r={15} fill={`url(#${id}-marca)`} />
      <path
        d="M224 140 l6 6 l11 -12"
        stroke={C.b900}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x={216}
        y={166}
        width={32}
        height={5}
        rx={2.5}
        fill={C.b400}
        opacity={0.6}
      />
      <rect x={220} y={176} width={24} height={5} rx={2.5} fill={C.edge} />
      <circle cx={56} cy={70} r={5} fill={C.b300} opacity={0.7} />
      <circle cx={270} cy={72} r={3.5} fill={C.b300} opacity={0.6} />
    </>
  );
}

function PagasEnCuotas() {
  const id = "pi-pc";
  return (
    <>
      <Defs id={id} />
      <rect
        x={64}
        y={36}
        width={192}
        height={150}
        rx={16}
        fill={C.card}
        stroke={C.edge}
        strokeWidth={2.5}
      />
      <path
        d="M64 70 V52 a16 16 0 0 1 16 -16 H240 a16 16 0 0 1 16 16 V70 Z"
        fill={`url(#${id}-marca)`}
      />
      <rect x={96} y={24} width={8} height={24} rx={4} fill={C.b900} />
      <rect x={216} y={24} width={8} height={24} rx={4} fill={C.b900} />
      {[0, 1, 2].map((i) => {
        const x = 108 + i * 52;
        const pagada = i === 0;
        const encurso = i === 1;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={118}
              r={20}
              fill={pagada ? C.b400 : C.navy}
              stroke={encurso ? C.b300 : C.b700}
              strokeWidth={encurso ? 4 : 2.5}
            />
            {pagada ? (
              <path
                d={`M${x - 8} 118 l6 6 l11 -12`}
                stroke={C.b900}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : (
              <circle
                cx={x}
                cy={118}
                r={encurso ? 6 : 4}
                fill={encurso ? C.b300 : C.b700}
              />
            )}
          </g>
        );
      })}
      <path
        d="M128 118 H136 M180 118 H188"
        stroke={C.b700}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      <rect x={88} y={152} width={144} height={8} rx={4} fill={C.navy} />
      <rect
        x={88}
        y={152}
        width={52}
        height={8}
        rx={4}
        fill={`url(#${id}-marca)`}
      />
      <circle cx={262} cy={58} r={5} fill={C.b300} opacity={0.7} />
      <circle cx={52} cy={150} r={3.5} fill={C.b300} opacity={0.6} />
    </>
  );
}

const DIBUJO: Record<NombreIlustracion, () => React.ReactElement> = {
  "que-es-atlas": QueEsAtlas,
  "escaneas-y-listo": EscaneasYListo,
  "pagas-en-cuotas": PagasEnCuotas,
  "construyes-historial": ConstruyesHistorial,
};

export const NOMBRES_DE_ILUSTRACION = Object.keys(
  DIBUJO,
) as NombreIlustracion[];

export function Ilustracion({
  nombre,
  ancho = 300,
}: Readonly<{ nombre: NombreIlustracion; ancho?: number }>) {
  const Dibujo = DIBUJO[nombre];
  return (
    <svg
      width={ancho}
      height={Math.round((ancho * 220) / 320)}
      viewBox="0 0 320 220"
      aria-hidden
      data-testid={`ilustracion-${nombre}`}
    >
      <Dibujo />
    </svg>
  );
}
