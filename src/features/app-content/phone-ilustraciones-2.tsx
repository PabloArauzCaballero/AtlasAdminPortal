/**
 * Las otras dos ilustraciones de la Bienvenida (escanear y construir historial), separadas de
 * `phone-ilustraciones.tsx` sólo por el tope de 300 líneas por archivo. Mismo dibujo y misma paleta que en la app.
 */
import { C, Defs } from "./phone-ilustraciones-base";

const CELDAS_QR: ReadonlyArray<readonly [number, number]> = [
  [3, 0],
  [5, 0],
  [3, 1],
  [4, 1],
  [6, 1],
  [0, 3],
  [2, 3],
  [3, 3],
  [5, 3],
  [1, 4],
  [3, 4],
  [4, 4],
  [6, 4],
  [0, 5],
  [2, 5],
  [4, 5],
  [5, 5],
  [3, 6],
  [5, 6],
  [6, 6],
];
const ESQUINAS_QR: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [5, 0],
  [0, 5],
];
const VISOR: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 1, 1],
  [88, 0, -1, 1],
  [0, 88, 1, -1],
  [88, 88, -1, -1],
];

export function EscaneasYListo() {
  const id = "pi-es";
  return (
    <>
      <Defs id={id} />
      <rect
        x={96}
        y={20}
        width={128}
        height={186}
        rx={18}
        fill={C.navy}
        stroke={C.b400}
        strokeWidth={3.5}
      />
      <rect x={140} y={28} width={40} height={6} rx={3} fill={C.b700} />
      <g transform="translate(116 56)">
        <rect width={88} height={88} rx={8} fill={C.card} />
        <g transform="translate(12 12)">
          {ESQUINAS_QR.map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x * 9.1} ${y * 9.1})`}>
              <rect width={18} height={18} rx={3} fill={C.b300} />
              <rect x={4} y={4} width={10} height={10} rx={1.5} fill={C.card} />
              <rect x={6.5} y={6.5} width={5} height={5} rx={1} fill={C.b300} />
            </g>
          ))}
          {CELDAS_QR.map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x * 9.1}
              y={y * 9.1}
              width={7.5}
              height={7.5}
              rx={1.5}
              fill={C.b400}
              opacity={0.9}
            />
          ))}
        </g>
        {VISOR.map(([x, y, dx, dy]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x + dx * 18} ${y} H${x} V${y + dy * 18}`}
            stroke={C.b300}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </g>
      <rect
        x={110}
        y={98}
        width={100}
        height={4}
        rx={2}
        fill={`url(#${id}-marca)`}
      />
      <rect
        x={120}
        y={168}
        width={80}
        height={22}
        rx={11}
        fill={`url(#${id}-marca)`}
      />
      <path
        d="M144 179 l7 7 l13 -14"
        stroke={C.b900}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

const ESCALONES = [
  { x: 38, h: 38 },
  { x: 86, h: 70 },
  { x: 134, h: 102 },
  { x: 182, h: 134 },
  { x: 230, h: 166 },
];

export function ConstruyesHistorial() {
  const id = "pi-ch";
  return (
    <>
      <Defs id={id} />
      {ESCALONES.map((e, i) => (
        <rect
          key={e.x}
          x={e.x}
          y={196 - e.h}
          width={44}
          height={e.h}
          rx={8}
          fill={i === ESCALONES.length - 1 ? `url(#${id}-marca)` : C.card}
          stroke={i === ESCALONES.length - 1 ? "none" : C.b700}
          strokeWidth={2}
          opacity={0.55 + i * 0.11}
        />
      ))}
      {ESCALONES.slice(0, 4).map((e, i) => (
        <circle
          key={`m-${e.x}`}
          cx={e.x + 22}
          cy={196 - e.h + 18}
          r={7}
          fill={C.b400}
          opacity={0.35 + i * 0.2}
        />
      ))}
      <path
        d="M44 160 L108 118 L156 134 L236 62"
        stroke={C.b300}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="1 11"
      />
      <path
        d="M252 20 l6.4 13 14.4 2.1 -10.4 10.1 2.5 14.3 -12.9 -6.8 -12.9 6.8 2.5 -14.3 -10.4 -10.1 14.4 -2.1 Z"
        fill={`url(#${id}-marca)`}
        stroke={C.b900}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </>
  );
}
