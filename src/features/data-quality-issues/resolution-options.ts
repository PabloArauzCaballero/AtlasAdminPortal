import type { Option } from "@/shared/lib/options";

/** Las tres resoluciones del diálogo. Sólo «Reconocer» deja la incidencia pendiente. */
export const RESOLUTION_OPTIONS: Option[] = [
  {
    value: "acknowledged",
    label: "Reconocer",
    description:
      "Es real y te haces cargo; sigue pendiente hasta corregirla o descartarla.",
  },
  {
    value: "resolved",
    label: "Corregida",
    description: "El dato ya se corrigió; la incidencia queda cerrada.",
  },
  {
    value: "ignored",
    label: "Descartar",
    description:
      "No hace falta corregir el dato; se cierra y el motivo queda en las notas.",
  },
];

/** Motivos codificados, para agrupar las decisiones en la auditoría. */
export const REASON_OPTIONS: Option[] = [
  {
    value: "manual_review",
    label: "Revisión manual",
    description: "Una persona revisó el registro y decidió con su criterio.",
  },
  {
    value: "source_validated",
    label: "Validado contra la fuente",
    description: "Se comprobó el dato contra el documento o sistema de origen.",
  },
  {
    value: "false_positive",
    label: "Falso positivo",
    description: "La regla marcó un dato que en realidad era correcto.",
  },
  {
    value: "temporary_exception",
    label: "Excepción temporal",
    description:
      "Se acepta por ahora con motivo, a la espera de una corrección posterior.",
  },
];
