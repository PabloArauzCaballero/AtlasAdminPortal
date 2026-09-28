import type { Option } from "@/shared/lib/options";
import {
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_TYPES,
  type PrivacyTransitionTarget,
} from "./types";

/** Estados en palabras de quien atiende la cola, con qué significa cada uno. */
export const STATUS_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  received: {
    label: "Recibida",
    description: "La pidió el cliente y todavía nadie la ha tomado.",
  },
  in_progress: {
    label: "En atención",
    description: "Alguien de cumplimiento la tomó y la está atendiendo.",
  },
  completed: {
    label: "Atendida",
    description:
      "Se atendió el pedido y quedó escrito cómo. No implica que se hayan borrado datos.",
  },
  rejected: {
    label: "Rechazada",
    description:
      "No procede, con el motivo que se le explica al titular (p. ej. retención legal).",
  },
};

export const TYPE_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  access: {
    label: "Acceso",
    description: "Quiere saber qué datos suyos guarda Atlas.",
  },
  rectification: {
    label: "Rectificación",
    description: "Pide corregir un dato suyo que está mal.",
  },
  deletion: {
    label: "Supresión",
    description:
      "Pide borrar sus datos; lo que la ley obliga a conservar no se borra.",
  },
  erasure: {
    label: "Supresión (anterior)",
    description: "Supresión registrada con el código antiguo de la tabla.",
  },
  portability: {
    label: "Portabilidad",
    description: "Pide una copia de sus datos para llevárselos.",
  },
  revocation: {
    label: "Revocación",
    description: "Retira consentimientos que había dado.",
  },
  restriction: {
    label: "Limitación",
    description: "Pide limitar el uso de sus datos mientras se revisa algo.",
  },
  objection: {
    label: "Oposición",
    description: "Se opone a un tratamiento concreto de sus datos.",
  },
};

export const statusLabel = (value: string | null | undefined) =>
  (value && STATUS_LABELS[value]?.label) ?? value ?? "—";

export const typeLabel = (value: string | null | undefined) =>
  (value && TYPE_LABELS[value]?.label) ?? value ?? "—";

export const STATUS_OPTIONS: Option[] = PRIVACY_REQUEST_STATUSES.map(
  (value) => ({ value, ...STATUS_LABELS[value]! }),
);

export const TYPE_OPTIONS: Option[] = PRIVACY_REQUEST_TYPES.map((value) => ({
  value,
  ...TYPE_LABELS[value]!,
}));

export const OVERDUE_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Vencidas",
    description: "Abiertas con más de 15 días naturales desde la recepción.",
  },
  {
    value: "false",
    label: "En plazo o cerradas",
    description: "Todas las que no están vencidas, incluidas las ya cerradas.",
  },
];

/** Lo que dice cada botón y lo que explica su diálogo antes de confirmar. */
export const TRANSITION_COPY: Record<
  PrivacyTransitionTarget,
  { action: string; title: string; description: string; needsReason: boolean }
> = {
  in_progress: {
    action: "Tomar",
    title: "Tomar la solicitud",
    description:
      "Quedarás como responsable y la solicitud pasará a «En atención». Queda en el historial.",
    needsReason: false,
  },
  completed: {
    action: "Marcar atendida",
    title: "Marcar la solicitud como atendida",
    description:
      "Escribe cómo se atendió (qué se entregó, qué se corrigió). Esto NO borra datos: si pidió supresión, el borrado se hace a mano respetando lo que la ley obliga a conservar.",
    needsReason: true,
  },
  rejected: {
    action: "Rechazar",
    title: "Rechazar la solicitud",
    description:
      "Escribe por qué no procede: es lo que se le contesta al titular y queda en la auditoría.",
    needsReason: true,
  },
};

export const MIN_REASON_LENGTH = 10;
