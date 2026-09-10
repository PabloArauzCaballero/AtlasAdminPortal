import type { FlowReviewReason, FlowReviewStatus } from "./types";

type Tono = "success" | "warning" | "critical" | "muted";

export const MOTIVO: Record<FlowReviewReason, { label: string; hint: string }> =
  {
    SIN_ANALISIS: {
      label: "Sin análisis",
      hint: "No se pudo seguir el handler: del flujo sólo se conoce su ruta.",
    },
    ANALISIS_PARCIAL: {
      label: "Análisis parcial",
      hint: "Se siguió el código, pero no hasta el final.",
    },
    HUECOS_SIN_RESOLVER: {
      label: "Huecos sin resolver",
      hint: "SQL dinámico, profundidad máxima o un modelo sin tabla conocida.",
    },
    EVENTO_DINAMICO: {
      label: "Evento de código dinámico",
      hint: "Publica un evento cuyo código se arma en ejecución: quién lo recoge depende del valor.",
    },
  };

export const ESTADO: Record<FlowReviewStatus, { label: string; tone: Tono }> = {
  AUTO_DETECTED: { label: "Sin revisión pedida", tone: "muted" },
  NEEDS_REVIEW: { label: "Pendiente", tone: "warning" },
  APPROVED: { label: "Aprobado", tone: "success" },
  REJECTED: { label: "Rechazado", tone: "critical" },
};
