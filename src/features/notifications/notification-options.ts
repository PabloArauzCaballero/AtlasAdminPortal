import type { Option } from "@/shared/lib/options";
import type { BroadcastAudience, NotificationChannel } from "./types";

/**
 * Los vocabularios de la mensajería con lo que significa cada valor.
 *
 * Los valores son los del backend y NO cambian; hasta ahora se enseñaban crudos
 * (`internal_user`, `retrying`) y había que saber de memoria qué quería decir cada uno.
 */
export const CHANNEL_OPTIONS: (Option & { value: NotificationChannel })[] = [
  {
    value: "in_app",
    label: "in_app",
    description:
      "Aparece en la bandeja de avisos dentro de la app o del portal.",
  },
  {
    value: "push",
    label: "push",
    description:
      "Notificación del sistema en el móvil, aunque la app esté cerrada.",
  },
  {
    value: "email",
    label: "email",
    description: "Correo al buzón registrado; para lo que necesita constancia.",
  },
  {
    value: "sms",
    label: "sms",
    description: "Mensaje de texto al teléfono; corto y con coste por envío.",
  },
  {
    value: "whatsapp",
    label: "whatsapp",
    description: "Mensaje por WhatsApp con plantilla aprobada por Meta.",
  },
  {
    value: "phone",
    label: "phone",
    description: "Llamada de voz; sólo para avisos que no admiten demora.",
  },
];

export const MESSAGE_STATUS_OPTIONS: Option[] = [
  {
    value: "pending",
    label: "pending",
    description: "Creado pero todavía no puesto en la cola de envío.",
  },
  {
    value: "queued",
    label: "queued",
    description: "En la cola, esperando turno del trabajador de envío.",
  },
  {
    value: "sending",
    label: "sending",
    description: "El proveedor lo está enviando en este momento.",
  },
  {
    value: "sent",
    label: "sent",
    description: "El proveedor lo aceptó; aún sin confirmar la entrega.",
  },
  {
    value: "delivered",
    label: "delivered",
    description: "El proveedor confirmó que llegó al destinatario.",
  },
  {
    value: "read",
    label: "read",
    description: "El destinatario lo abrió (sólo canales que lo informan).",
  },
  {
    value: "failed",
    label: "failed",
    description: "Falló sin más reintentos; hay que revisar el motivo.",
  },
  {
    value: "retrying",
    label: "retrying",
    description: "Falló una vez y se volverá a intentar automáticamente.",
  },
  {
    value: "cancelled",
    label: "cancelled",
    description: "Anulado antes de enviarse; no llegará a nadie.",
  },
];

export const RECIPIENT_TYPE_OPTIONS: Option[] = [
  {
    value: "customer",
    label: "customer",
    description: "Un cliente final de la app de Atlas.",
  },
  {
    value: "merchant",
    label: "merchant",
    description: "Un comercio socio o uno de sus usuarios del ERP.",
  },
  {
    value: "internal_user",
    label: "internal_user",
    description: "Una persona del equipo interno que usa este portal.",
  },
  {
    value: "operations",
    label: "operations",
    description: "Un buzón del equipo de operaciones, no una persona.",
  },
  {
    value: "system",
    label: "system",
    description: "Otro servicio de la plataforma, sin persona detrás.",
  },
];

export const AUDIENCE_OPTIONS: (Option & { value: BroadcastAudience })[] = [
  {
    value: "customers",
    label: "Todos los customers",
    description:
      "Sólo clientes de la app; vacío en IDs llega a todos los activos.",
  },
  {
    value: "internal_users",
    label: "Todos los usuarios internos",
    description:
      "Sólo el equipo interno del portal; útil para avisos de operación.",
  },
  {
    value: "both",
    label: "Customers + usuarios internos",
    description:
      "Clientes y equipo interno a la vez; revisa bien antes de enviar.",
  },
];
