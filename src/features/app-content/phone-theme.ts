/**
 * Los colores y medidas de la app del cliente (`apps/consumer-app/src/theme/tokens.ts`), para que el
 * celular del portal sea la MISMA pantalla y no una maqueta clara de lo que en la app es oscuro.
 *
 * Se copian por valor porque la app es otro repositorio. Si cambia un token allí, cambia aquí.
 */
export const PHONE = {
  /** El lienzo se maqueta al ancho lógico de un teléfono y se reduce: así cada medida es la de la app. */
  width: 390,
  height: 780,
  scale: 0.7,
  bg: "#061426",
  card: "#0B1E36",
  line: "rgba(255,255,255,0.09)",
  text1: "#EDF3F9",
  text2: "#94A8BF",
  text3: "#7489A6",
  brand300: "#5CF0CC",
  brand400: "#2BE0A8",
  brand500: "#14A894",
  brand700: "#0E7377",
  brand900: "#052033",
  successSoft: "rgba(43,224,168,0.14)",
  whatsapp: "#128C7E",
  /** Degradado del botón principal (`gradient.brandGradient`). */
  brandGradient: "linear-gradient(90deg,#5CF0CC,#2BE0A8,#14A894)",
} as const;

/** Iconos por defecto de los pasos de la Bienvenida, en orden (`PASOS_POR_DEFECTO` de la app). */
export const ICONOS_PASO = ["escanear", "billetera", "tendencia"] as const;
