import type { Option } from "@/shared/lib/options";

/**
 * Los iconos que la app ya trae, con el nombre que lee (`ICON_NAMES` en `ui/icons.tsx` de la app).
 *
 * Si se añade uno allí hay que añadirlo aquí; si aquí se escribe uno que la app no tiene, la app
 * pinta el de por defecto en lugar de fallar, así que el desajuste no rompe nada: sólo no se ve el
 * icono que se quería.
 */
const ICONOS_DE_ATLAS: Array<[string, string]> = [
  ["check", "Visto bueno"],
  ["alerta", "Alerta"],
  ["reloj", "Reloj"],
  ["candado", "Candado"],
  ["escudo", "Escudo"],
  ["documento", "Documento"],
  ["ayuda", "Ayuda"],
  ["info", "Información"],
  ["billetera", "Billetera"],
  ["tendencia", "Tendencia"],
  ["estrella", "Estrella"],
  ["ojo", "Ojo"],
  ["escanear", "Escanear"],
  ["pagos", "Pagos"],
  ["ubicacion", "Ubicación"],
  ["camara", "Cámara"],
  ["telefono", "Teléfono"],
  ["sobre", "Sobre"],
  ["chispa", "Chispa"],
  ["comercio", "Comercio"],
  ["etiqueta", "Etiqueta"],
  ["grafico", "Gráfico"],
  ["lista", "Lista"],
  ["educacion", "Educación"],
  ["hogar", "Hogar"],
  ["salud", "Salud"],
  ["transporte", "Transporte"],
  ["servicios", "Servicios"],
  ["supermercado", "Supermercado"],
  ["ropa", "Ropa"],
  ["celulares", "Celulares"],
  ["electronica", "Electrónica"],
];

export const ICON_OPTIONS: Option[] = ICONOS_DE_ATLAS.map(([value, label]) => ({
  value,
  label,
}));

/** Tope del icono propio una vez procesado. Lo mismo que valida el servidor. */
export const MAX_ICON_BYTES = 32 * 1024;
