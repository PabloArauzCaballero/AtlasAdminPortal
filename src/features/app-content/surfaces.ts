import type { ContentSurface } from "./types";

/** Publicar o cambiar lo que lee el cliente es gestión, no lectura: el servidor exige lo mismo. */
export const APP_CONTENT_MANAGE = ["governance.policies.manage"];

/**
 * Las superficies del catálogo y lo que pasa en la app cuando una está vacía.
 *
 * El estado vacío decía para todas «la app usará sus textos por defecto», y sólo es verdad en dos:
 * la bienvenida y la pantalla de permisos traen su texto de fábrica. Preguntas frecuentes y Ayuda
 * NO: sin piezas publicadas la pantalla de ayuda del cliente sale sin preguntas y sin contacto de
 * soporte. Y Inicio, Perfil y Crédito se pintan como tarjetas (`SurfaceContent` en la app) desde que la app las
 * lee; `readByApp` sigue existiendo para avisar si una superficie nueva se añade al catálogo antes
 * que la app.
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
    whenEmpty:
      "Inicio no muestra ningún aviso hasta que se publique aquí la primera pieza. Cada pieza sale como una tarjeta bajo el saludo.",
    readByApp: true,
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
    whenEmpty:
      "Perfil no muestra ningún texto extra hasta que se publique aquí la primera pieza. Cada pieza sale como una tarjeta arriba del todo.",
    readByApp: true,
  },
  {
    value: "credit",
    label: "Crédito",
    hint: "Explicaciones de la línea y el puntaje",
    whenEmpty:
      "Perfil no muestra ninguna explicación de la línea ni del puntaje hasta que se publique aquí la primera pieza. Sale como una tarjeta bajo el puntaje.",
    readByApp: true,
  },
  {
    value: "tour",
    label: "Recorrido guiado",
    hint: "Los tres pasos que explican la pantalla de Inicio",
    whenEmpty:
      "La app usa los pasos del recorrido de fábrica hasta que se publique aquí una pieza con la clave del paso (inicio.linea, inicio.escanear, inicio.pagos).",
    readByApp: true,
  },
  {
    value: "signup",
    label: "Alta: promesas",
    hint: "Qué se le dice a la persona sobre cada dato que se le pide al registrarse",
    whenEmpty:
      "La app usa las promesas de fábrica hasta que se publique aquí la pieza de ese dato. Son texto con implicaciones legales: las firma quien responde de la política de privacidad.",
    readByApp: true,
  },
  {
    value: "privacy",
    label: "Privacidad",
    hint: "La pantalla «Tus datos»: permisos, derechos y plazos",
    whenEmpty:
      "La pantalla Privacidad usa sus textos de fábrica hasta que se publique aquí la primera pieza.",
    readByApp: true,
  },
];

export function surfaceOption(surface: ContentSurface): SurfaceOption {
  return SURFACES.find((option) => option.value === surface) ?? SURFACES[0];
}
