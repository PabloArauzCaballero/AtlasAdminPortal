import { ICONOS_BASE } from "./app-icons-base";
import { ICONOS_MAS } from "./app-icons-mas";
import { ICONOS_RESTO } from "./app-icons-resto";
/**
 * Los iconos de la app del cliente (`apps/consumer-app/src/ui/icons.tsx`), trazado por trazado.
 *
 * Se copian y no se redibujan para que el celular del portal enseñe el icono QUE VERÁ la persona:
 * mismo trazo, misma rejilla de 24 y el mismo grosor compensado por tamaño. Si se añade un icono en
 * la app hay que añadirlo aquí (y a `ICON_LABELS`); uno desconocido pinta el de por defecto, igual
 * que hace la app.
 */
const GRID = 24;
const STROKE = 1.75;

const PATHS = { ...ICONOS_BASE, ...ICONOS_MAS, ...ICONOS_RESTO };

export const APP_ICON_NAMES = Object.keys(PATHS);

export function AppIcon({
  name,
  size = 22,
  tint = "currentColor",
}: Readonly<{ name: string; size?: number; tint?: string }>) {
  const draw = PATHS[name] ?? PATHS.check;
  // El grosor se compensa contra el tamaño: el trazo mide lo mismo en pantalla a cualquier escala.
  const width = (STROKE * GRID) / size;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      fill="none"
      aria-hidden="true"
    >
      {draw(tint, width)}
    </svg>
  );
}
