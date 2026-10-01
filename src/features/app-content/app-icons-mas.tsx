/** Los iconos de la segunda tanda: ubicación, dinero, activos y comunicación. Copiados de `apps/consumer-app/src/ui/icons.tsx`. */
import type { ReactNode } from "react";

export type IconDraw = (stroke: string, width: number) => ReactNode;

export const ICONOS_MAS: Record<string, IconDraw> = {
  /*
    La «i» dentro del circulo, sobre la MISMA rejilla de 24 y el mismo radio de 8.5 que `ayuda`.

    El punto va arriba y el asta abajo —al reves que la interrogacion, que tiene el gancho arriba y
    el punto abajo—: es lo unico que distingue los dos iconos de un vistazo a 18 px, y por eso el
    radio del punto y el grosor del asta son los mismos que alli.
  */
  info: (s, w) => (
    <>
      <circle cx={12} cy={12} r={8.5} stroke={s} strokeWidth={w} />
      <circle cx={12} cy={8.2} r={0.9} fill={s} />
      <path d="M12 11.4v5" stroke={s} strokeWidth={w} strokeLinecap="round" />
    </>
  ),
  salir: (s, w) => (
    <>
      <path
        d="M14.5 3.5H6a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 6 20.5h8.5"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M16 8.5 19.5 12 16 15.5M19.5 12H9.5"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  copiar: (s, w) => (
    <>
      <rect
        x={8.5}
        y={8.5}
        width={12}
        height={12}
        rx={2}
        stroke={s}
        strokeWidth={w}
      />
      <path
        d="M15.5 5.5v-1a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  ubicacion: (s, w) => (
    <>
      <path
        d="M12 21.2c4-4 6-7.1 6-9.7a6 6 0 1 0-12 0c0 2.6 2 5.7 6 9.7z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={11.2} r={2.4} stroke={s} strokeWidth={w} />
    </>
  ),
  billetera: (s, w) => (
    <>
      <rect
        x={3.5}
        y={6.5}
        width={17}
        height={13}
        rx={2.5}
        stroke={s}
        strokeWidth={w}
      />
      <path d="M3.5 10.5h17" stroke={s} strokeWidth={w} strokeLinecap="round" />
      <circle cx={16.5} cy={15} r={1.2} fill={s} />
    </>
  ),
  // Destello de cuatro puntas: lo nuevo, lo aprobado, lo que merece mirarse.
  chispa: (s, w) => (
    <path
      d="M12 3.5c.5 4 1.5 5 5.5 5.5-4 .5-5 1.5-5.5 5.5-.5-4-1.5-5-5.5-5.5 4-.5 5-1.5 5.5-5.5zM18 15c.25 2 .75 2.5 2.75 2.75-2 .25-2.5.75-2.75 2.75-.25-2-.75-2.5-2.75-2.75 2-.25 2.5-.75 2.75-2.75z"
      stroke={s}
      strokeWidth={w}
      strokeLinejoin="round"
    />
  ),
  // La burbuja de chat con la chispa dentro: el asistente que contesta al momento. La cola apunta
  // abajo-izquierda, hacia quien escribe; la chispa va centrada y pequeña para leerse a 22 px.
  asistente: (s, w) => (
    <>
      <path
        d="M4 7A2.5 2.5 0 0 1 6.5 4.5h11A2.5 2.5 0 0 1 20 7v6.5a2.5 2.5 0 0 1-2.5 2.5H11.8l-3.9 3.4a.5.5 0 0 1-.83-.38V16A2.5 2.5 0 0 1 4 13.5z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M12 6.9c.35 2.5 1 3.15 3.5 3.5-2.5.35-3.15 1-3.5 3.5-.35-2.5-1-3.15-3.5-3.5 2.5-.35 3.15-1 3.5-3.5z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
    </>
  ),
  refrescar: (s, w) => (
    <>
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M20.5 3.5v4.2h-4.2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // --- Rubros ---
  // Birrete: la tapa y la borla. Es el simbolo de estudiar, no de un libro.
  educacion: (s, w) => (
    <>
      <path
        d="M2.8 9.2 12 5l9.2 4.2L12 13.4z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M6.5 11v4.6c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9V11"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M21.2 9.6v4.2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  // Pantalla sobre pie: lo que distingue un televisor de una caja es el pie.
  electronica: (s, w) => (
    <>
      <rect
        x={3}
        y={4.5}
        width={18}
        height={11.5}
        rx={2}
        stroke={s}
        strokeWidth={w}
      />
      <path
        d="M9 20h6M12 16v4"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  celulares: (s, w) => (
    <>
      <rect
        x={6.5}
        y={2.5}
        width={11}
        height={19}
        rx={2.5}
        stroke={s}
        strokeWidth={w}
      />
      <path d="M10.5 18.5h3" stroke={s} strokeWidth={w} strokeLinecap="round" />
    </>
  ),
  // Camiseta: los hombros y el cuerpo. El cuello es lo que la hace legible a 20 px.
  ropa: (s, w) => (
    <path
      d="M9 3.5 5 5.6 3.5 9.4l2.6 1.2V20a1 1 0 0 0 1 1h9.8a1 1 0 0 0 1-1v-9.4l2.6-1.2L19 5.6l-4-2.1a3 3 0 0 1-6 0z"
      stroke={s}
      strokeWidth={w}
      strokeLinejoin="round"
    />
  ),
  // Sofa: respaldo, asiento y dos brazos.
  hogar: (s, w) => (
    <>
      <path
        d="M4.5 11V8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M3 13.5a2 2 0 0 1 4 0v2.5h10v-2.5a2 2 0 0 1 4 0V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
    </>
  ),
  // Cruz sanitaria dentro del marco: la cruz sola se confunde con «cerrar».
  salud: (s, w) => (
    <>
      <rect
        x={3.5}
        y={3.5}
        width={17}
        height={17}
        rx={4}
        stroke={s}
        strokeWidth={w}
      />
      <path
        d="M12 8v8M8 12h8"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  // Carrito: la cesta, el mango y las ruedas.
  supermercado: (s, w) => (
    <>
      <path
        d="M2.5 4h2.2l2.4 10.5a1.5 1.5 0 0 0 1.46 1.15h8.1a1.5 1.5 0 0 0 1.46-1.14L19.8 7.5H6"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={9.5} cy={19.5} r={1.3} stroke={s} strokeWidth={w} />
      <circle cx={16.5} cy={19.5} r={1.3} stroke={s} strokeWidth={w} />
    </>
  ),
};
