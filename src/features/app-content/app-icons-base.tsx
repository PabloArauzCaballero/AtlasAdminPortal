/** Los iconos de navegación y de estado de la app (primera tanda). Copiados de `apps/consumer-app/src/ui/icons.tsx`. */
import type { ReactNode } from "react";

export type IconDraw = (stroke: string, width: number) => ReactNode;

export const ICONOS_BASE: Record<string, IconDraw> = {
  // Casa: el techo y la puerta. Nada de ventanas: desaparecen al tamano real.
  inicio: (s, w) => (
    <>
      <path
        d="M3.5 10.2 12 3.8l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M9.5 20.5v-5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5.2"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
    </>
  ),
  // Escaner: las cuatro esquinas del visor y la linea de lectura. Es el gesto, no el aparato.
  escanear: (s, w) => (
    <>
      <path
        d="M3.5 8.5v-3a2 2 0 0 1 2-2h3M15.5 3.5h3a2 2 0 0 1 2 2v3M20.5 15.5v3a2 2 0 0 1-2 2h-3M8.5 20.5h-3a2 2 0 0 1-2-2v-3"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 12h17" stroke={s} strokeWidth={w} strokeLinecap="round" />
    </>
  ),
  // Calendario de cuotas: la hoja y tres marcas. Las marcas son las cuotas, no adorno.
  pagos: (s, w) => (
    <>
      <rect
        x={3.5}
        y={5.5}
        width={17}
        height={15}
        rx={2.5}
        stroke={s}
        strokeWidth={w}
      />
      <path
        d="M8 3.5v4M16 3.5v4M3.5 10.5h17"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M8 14.5h2M14 14.5h2M8 17.5h2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  perfil: (s, w) => (
    <>
      <circle cx={12} cy={8.5} r={3.75} stroke={s} strokeWidth={w} />
      <path
        d="M4.5 20.5c0-3.6 3.4-5.75 7.5-5.75s7.5 2.15 7.5 5.75"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  atras: (s, w) => (
    <path
      d="M14.5 5 8 12l6.5 7"
      stroke={s}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  adelante: (s, w) => (
    <path
      d="M9.5 5 16 12l-6.5 7"
      stroke={s}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  check: (s, w) => (
    <path
      d="M5 12.8 9.7 17.5 19 7"
      stroke={s}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  alerta: (s, w) => (
    <>
      <path
        d="M12 3.8 21.5 20a1 1 0 0 1-.87 1.5H3.37A1 1 0 0 1 2.5 20z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path d="M12 9.5v5" stroke={s} strokeWidth={w} strokeLinecap="round" />
      <circle cx={12} cy={18} r={0.9} fill={s} />
    </>
  ),
  reloj: (s, w) => (
    <>
      <circle cx={12} cy={12} r={8.5} stroke={s} strokeWidth={w} />
      <path
        d="M12 7v5.3l3.4 2"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  candado: (s, w) => (
    <>
      <rect
        x={4.5}
        y={10.5}
        width={15}
        height={10}
        rx={2.5}
        stroke={s}
        strokeWidth={w}
      />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </>
  ),
  escudo: (s, w) => (
    <>
      <path
        d="M12 3 19.5 6v6c0 4.4-3 7.7-7.5 9.2C7.5 19.7 4.5 16.4 4.5 12V6z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M9 12.2 11.3 14.5 15.4 10"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  camara: (s, w) => (
    <>
      <path
        d="M3.5 8.8a2 2 0 0 1 2-2h1.9l1.3-2.1a1 1 0 0 1 .85-.47h4.9a1 1 0 0 1 .85.47l1.3 2.1h1.9a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={13.2} r={3.6} stroke={s} strokeWidth={w} />
    </>
  ),
  documento: (s, w) => (
    <>
      <path
        d="M6.5 3.5h7L19.5 9v11.5a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3.5V9h6M9 13.5h6M9 17h4"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  editar: (s, w) => (
    <>
      <path
        d="M15.6 4.9a2.1 2.1 0 0 1 3 3L9.7 16.8l-4 1 1-4z"
        stroke={s}
        strokeWidth={w}
        strokeLinejoin="round"
      />
      <path d="M4.5 21h15" stroke={s} strokeWidth={w} strokeLinecap="round" />
    </>
  ),
  ayuda: (s, w) => (
    <>
      <circle cx={12} cy={12} r={8.5} stroke={s} strokeWidth={w} />
      <path
        d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.5"
        stroke={s}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <circle cx={12} cy={16.4} r={0.9} fill={s} />
    </>
  ),
};
