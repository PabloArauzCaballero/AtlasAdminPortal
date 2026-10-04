/**
 * Paleta y fondo comunes de las ilustraciones de la Bienvenida del portal (ver `phone-ilustraciones.tsx`).
 */

/** La paleta de la app (`theme/tokens.ts`). Sólo lo que dibujan estas ilustraciones. */
export const C = {
  navy: "#0C2C50",
  card: "#0B1E36",
  edge: "rgba(255,255,255,0.10)",
  b300: "#5CF0CC",
  b400: "#2BE0A8",
  b500: "#14A894",
  b700: "#0E7377",
  b900: "#052033",
} as const;

export function Defs({ id }: Readonly<{ id: string }>) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-marca`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.b300} />
          <stop offset="0.5" stopColor={C.b400} />
          <stop offset="1" stopColor={C.b500} />
        </linearGradient>
        <linearGradient id={`${id}-halo`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor={C.b400} stopOpacity="0.22" />
          <stop offset="1" stopColor={C.b400} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx={160} cy={112} r={104} fill={`url(#${id}-halo)`} />
    </>
  );
}
