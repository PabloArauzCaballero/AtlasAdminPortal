/** Los iconos de categorías de comercio y utilidades. Copiados de `apps/consumer-app/src/ui/icons.tsx`. */
import type { ReactNode } from "react";

export type IconDraw = (stroke: string, width: number) => ReactNode;

export const ICONOS_RESTO: Record<string, IconDraw> = {
  transporte: (s, w) => (
    <>
      <path
        d="M3.5 16.5v-4l1.9-4.4A2 2 0 0 1 7.24 7h9.52a2 2 0 0 1 1.84 1.1l1.9 4.4v4"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path d="M3.5 12.5h17" stroke={s} strokeWidth={w} strokeLinecap="round" />
      <circle cx={7.5} cy={16.5} r={1.4} stroke={s} strokeWidth={w} />
      <circle cx={16.5} cy={16.5} r={1.4} stroke={s} strokeWidth={w} />
    </>
  ),
  // Llave inglesa: servicios es «alguien viene y lo arregla».
  servicios: (s, w) => (
    <path
      d="M15.6 3.6a5 5 0 0 0-5.9 6.6l-6 6a1.8 1.8 0 0 0 2.55 2.55l6-6a5 5 0 0 0 6.6-5.9l-3 3-2.7-.55-.55-2.7z"
      stroke={s}
      strokeWidth={w}
      strokeLinejoin="round"
    />
  ),
  // Tienda: el toldo y la puerta.
  comercio: (s, w) => (
    <>
      <path
        d="M3.5 9.5 5 4.5h14l1.5 5a3 3 0 0 1-5.67 1.5 3 3 0 0 1-5.66 0A3 3 0 0 1 3.5 9.5z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M5 11.8V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7.2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M10 20.5v-4.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4.2"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
    </>
  ),
  // --- Controles ---
  grafico: (s, w) => (
    <>
      <path d="M4 20.5V4" stroke={s} strokeWidth={w} strokeLinecap="round" />
      <path d="M4 20.5h16" stroke={s} strokeWidth={w} strokeLinecap="round" />
      <path
        d="M8 17.5v-5M12.5 17.5v-9M17 17.5v-6"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  filtro: (s, w) => (
    <path
      d="M3.5 5.5h17l-6.6 7.4v5.6l-3.8 2v-7.6z"
      stroke={s}
      strokeWidth={w}
      strokeLinejoin="round"
    />
  ),
  lista: (s, w) => (
    <>
      <path
        d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <circle cx={4.5} cy={6.5} r={1} fill={s} />
      <circle cx={4.5} cy={12} r={1} fill={s} />
      <circle cx={4.5} cy={17.5} r={1} fill={s} />
    </>
  ),
  cuadricula: (s, w) => (
    <>
      <rect
        x={3.5}
        y={3.5}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={s}
        strokeWidth={w}
      />
      <rect
        x={13}
        y={3.5}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={s}
        strokeWidth={w}
      />
      <rect
        x={3.5}
        y={13}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={s}
        strokeWidth={w}
      />
      <rect
        x={13}
        y={13}
        width={7.5}
        height={7.5}
        rx={2}
        stroke={s}
        strokeWidth={w}
      />
    </>
  ),
  descargar: (s, w) => (
    <>
      <path d="M12 3.5v11" stroke={s} strokeWidth={w} strokeLinecap="round" />
      <path
        d="M7.8 10.5 12 14.7l4.2-4.2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  tendencia: (s, w) => (
    <>
      <path
        d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 6.5h5v5"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  etiqueta: (s, w) => (
    <>
      <path
        d="M11.6 3.5H19a1.5 1.5 0 0 1 1.5 1.5v7.4a2 2 0 0 1-.59 1.42l-6.6 6.6a2 2 0 0 1-2.83 0l-6.4-6.4a2 2 0 0 1 0-2.83l6.6-6.6a2 2 0 0 1 1.42-.59z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <circle cx={16} cy={8} r={1.3} stroke={s} strokeWidth={w} />
    </>
  ),
  estrella: (s, w) => (
    <path
      d="m12 3.8 2.6 5.28 5.83.85-4.22 4.11 1 5.81L12 17.11l-5.21 2.74 1-5.81L3.57 9.93l5.83-.85z"
      stroke={s}
      strokeWidth={w}
      strokeLinejoin="round"
    />
  ),
  /*
   * Ojo abierto y ojo TACHADO, no dos ojos parecidos.
   *
   * El par «ojo / ojo con la pupila un poco distinta» es el error clasico de este control: a 20 px
   * los dos estados se ven iguales y nadie sabe si esta mostrando u ocultando. La barra diagonal es
   * lo unico que se distingue de un vistazo.
   */
  /*
   * Un sobre, no una hoja.
   *
   * El campo de correo llevaba el icono de documento porque era lo que habia. Un icono aproximado es
   * peor que ninguno: se lee antes que la etiqueta y deja al lector corrigiendose solo.
   */
  sobre: (s, w) => (
    <>
      <rect
        x={2.5}
        y={5}
        width={19}
        height={14}
        rx={2.5}
        stroke={s}
        strokeWidth={w}
      />
      <path
        d="m3.2 6.6 8.03 5.36a1.4 1.4 0 0 0 1.54 0L20.8 6.6"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  /*
   * Un auricular, no una chincheta.
   *
   * La fila del telefono llevaba el icono de ubicacion. Los dos son datos de contacto y estan uno
   * encima del otro en el perfil, asi que el icono equivocado no se lee como un descuido: se lee
   * como si la fila fuera la direccion.
   */
  telefono: (s, w) => (
    <path
      d="M7.4 3.5h-.9A2.6 2.6 0 0 0 4 6.3c.3 3.6 1.9 7 4.4 9.5s5.9 4.1 9.5 4.4a2.6 2.6 0 0 0 2.8-2.5v-.9a1.7 1.7 0 0 0-1.4-1.7l-2.2-.4a1.7 1.7 0 0 0-1.7.7l-.6.9a12.4 12.4 0 0 1-5.1-5.1l.9-.6a1.7 1.7 0 0 0 .7-1.7l-.4-2.2a1.7 1.7 0 0 0-1.5-1.2z"
      stroke={s}
      strokeWidth={w}
      strokeLinejoin="round"
    />
  ),
  ojo: (s, w) => (
    <>
      <path
        d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={12} r={2.9} stroke={s} strokeWidth={w} />
    </>
  ),
  "ojo-tachado": (s, w) => (
    <>
      <path
        d="M2.5 12s3.6-6 9.5-6c1.4 0 2.68.34 3.82.87M21.5 12s-1.3 2.16-3.7 3.93"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9a2.9 2.9 0 0 0 4.2 4.2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M17.8 15.93A9.6 9.6 0 0 1 12 18c-5.9 0-9.5-6-9.5-6"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 3.6l16.8 16.8"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
};
