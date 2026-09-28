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
    label: "En la app",
    description:
      "Aparece en la bandeja de avisos dentro de la app o del portal.",
  },
  {
    value: "push",
    label: "Push",
    description:
      "Notificación del sistema en el móvil, aunque la app esté cerrada.",
  },
  {
    value: "email",
    label: "Correo",
    description: "Correo al buzón registrado; para lo que necesita constancia.",
  },
  {
    value: "sms",
    label: "SMS",
    description: "Mensaje de texto al teléfono; corto y con coste por envío.",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Mensaje por WhatsApp con plantilla aprobada por Meta.",
  },
  {
    value: "phone",
    label: "Llamada",
    description: "Llamada de voz; sólo para avisos que no admiten demora.",
  },
];

export const MESSAGE_STATUS_OPTIONS: Option[] = [
  {
    value: "pending",
    label: "Pendiente",
    description: "Creado pero todavía no puesto en la cola de envío.",
  },
  {
    value: "queued",
    label: "En cola",
    description: "En la cola, esperando turno del trabajador de envío.",
  },
  {
    value: "sending",
    label: "Enviándose",
    description: "El proveedor lo está enviando en este momento.",
  },
  {
    value: "sent",
    label: "Enviado",
    description: "El proveedor lo aceptó; aún sin confirmar la entrega.",
  },
  {
    value: "delivered",
    label: "Entregado",
    description: "El proveedor confirmó que llegó al destinatario.",
  },
  {
    value: "read",
    label: "Leído",
    description: "El destinatario lo abrió (sólo canales que lo informan).",
  },
  {
    value: "failed",
    label: "Fallido",
    description: "Falló sin más reintentos; hay que revisar el motivo.",
  },
  {
    value: "retrying",
    label: "Reintentando",
    description: "Falló una vez y se volverá a intentar automáticamente.",
  },
  {
    value: "cancelled",
    label: "Cancelado",
    description: "Anulado antes de enviarse; no llegará a nadie.",
  },
];

export const RECIPIENT_TYPE_OPTIONS: Option[] = [
  {
    value: "customer",
    label: "Cliente",
    description: "Un cliente final de la app de Atlas.",
  },
  {
    value: "merchant",
    label: "Comercio",
    description: "Un comercio socio o uno de sus usuarios del ERP.",
  },
  {
    value: "internal_user",
    label: "Persona del equipo",
    description: "Una persona del equipo interno que usa este portal.",
  },
  {
    value: "operations",
    label: "Buzón de operaciones",
    description: "Un buzón del equipo de operaciones, no una persona.",
  },
  {
    value: "system",
    label: "Sistema",
    description: "Otro servicio de la plataforma, sin persona detrás.",
  },
];

export const AUDIENCE_OPTIONS: (Option & { value: BroadcastAudience })[] = [
  {
    value: "customers",
    label: "Todos los clientes",
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
    label: "Clientes y usuarios internos",
    description:
      "Clientes y equipo interno a la vez; revisa bien antes de enviar.",
  },
];
