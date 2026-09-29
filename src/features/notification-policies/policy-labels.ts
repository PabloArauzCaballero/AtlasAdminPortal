import type { Option } from "@/shared/lib/options";
import type { NotificationChannel } from "./types";

/** Cómo se llama el canal para quien administra: `push` no dice nada, «el teléfono» sí. */
export const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  push: "Notificación del teléfono",
  email: "Correo",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "Dentro de la app",
};

/** Los cinco canales que el servidor acepta: un catálogo cerrado, no lo que traiga la página. */
export const CHANNELS = Object.keys(CHANNEL_LABEL) as NotificationChannel[];

export const CATEGORY_LABEL: Record<string, string> = {
  pagos: "Pagos",
  credito: "Crédito",
  seguridad: "Seguridad",
  novedades: "Novedades",
  general: "General",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

export const MANDATORY_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Irrenunciables",
    description: "El cliente no puede apagarlas.",
  },
  {
    value: "false",
    label: "Apagables",
    description: "El cliente decide si las recibe.",
  },
];

export const ACTIVE_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Activas",
    description: "Salen en la pantalla de avisos de la app.",
  },
  {
    value: "false",
    label: "Inactivas",
    description: "Guardadas, pero la app no las enseña.",
  },
];
