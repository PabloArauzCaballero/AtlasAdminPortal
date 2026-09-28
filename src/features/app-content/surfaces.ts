import type { ContentSurface } from "./types";

/** Publicar o cambiar lo que lee el cliente es gestión, no lectura: el servidor exige lo mismo. */
export const APP_CONTENT_MANAGE = ["governance.policies.manage"];

/**
 * Las superficies del catálogo y lo que pasa en la app cuando una está vacía.
 *
 * El estado vacío decía para todas «la app usará sus textos por defecto», y sólo es verdad en dos:
 * la bienvenida y la pantalla de permisos traen su texto de fábrica. Preguntas frecuentes y Ayuda
 * NO: sin piezas publicadas la pantalla de ayuda del cliente sale sin preguntas y sin contacto de
 * soporte. Y Inicio, Perfil y Crédito existen en el catálogo pero la app todavía no las lee: lo que
 * se publique ahí se guarda y ningún cliente lo ve. Decirlo es lo que evita que alguien dé por
 * publicado un texto que nadie va a leer (comprobado contra `getContent(...)` de la app el
 * 2026-09-28: sólo pide `onboarding`, `faq`, `help` y `legal`).
 */
export type SurfaceOption = {
  value: ContentSurface;
  label: string;
  hint: string;
  /** Qué ve el cliente mientras no haya ninguna pieza publicada. */
  whenEmpty: string;
  /** La app pide esta superficie. Si no, lo que se publique no llega a ningún cliente. */
  readByApp: boolean;
};

const UNREAD =
  "La app todavía no lee esta pantalla: lo que se publique aquí queda guardado, pero ningún cliente lo verá hasta que la app lo use.";

export const SURFACES: readonly SurfaceOption[] = [
  {
    value: "onboarding",
    label: "Bienvenida",
    hint: "Eslogan y pasos que se ven antes de registrarse",
    whenEmpty:
      "La app enseña su bienvenida de fábrica hasta que se publique aquí la primera pieza.",
    readByApp: true,
  },
  {
    value: "faq",
    label: "Preguntas frecuentes",
    hint: "Las respuestas largas de la pantalla de ayuda",
    whenEmpty:
      "Ahora mismo la pantalla de ayuda de la app sale sin preguntas frecuentes: no tiene respuestas de fábrica.",
    readByApp: true,
  },
  {
    value: "help",
    label: "Ayuda y contacto",
    hint: "WhatsApp de soporte y acceso al recorrido guiado",
    whenEmpty:
      "Ahora mismo la app no ofrece el WhatsApp de soporte ni el recorrido guiado en Ayuda, Perfil y la verificación de identidad.",
    readByApp: true,
  },
  {
    value: "home",
    label: "Inicio",
    hint: "Avisos y mensajes de la pantalla principal",
    whenEmpty: UNREAD,
    readByApp: false,
  },
  {
    value: "legal",
    label: "Legal",
    hint: "Términos, privacidad y el texto con el que la app pide los permisos de ubicación y contactos",
    whenEmpty:
      "La app usa sus textos de permisos de fábrica hasta que se publique aquí la primera pieza.",
    readByApp: true,
  },
  {
    value: "profile",
    label: "Perfil",
    hint: "Textos de la pantalla de perfil",
    whenEmpty: UNREAD,
    readByApp: false,
  },
  {
    value: "credit",
    label: "Crédito",
    hint: "Explicaciones de la línea y el puntaje",
    whenEmpty: UNREAD,
    readByApp: false,
  },
];

export function surfaceOption(surface: ContentSurface): SurfaceOption {
  return SURFACES.find((option) => option.value === surface) ?? SURFACES[0];
}
