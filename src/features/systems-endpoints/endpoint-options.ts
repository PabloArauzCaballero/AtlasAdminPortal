export const riskOptions = [
  {
    label: "Riesgo bajo",
    value: "LOW",
    description: "Sólo lee o navega: no cambia datos.",
  },
  {
    label: "Riesgo medio",
    value: "MEDIUM",
    description: "Modifica datos de operación corriente.",
  },
  {
    label: "Riesgo alto",
    value: "HIGH",
    description: "Modifica datos importantes o sensibles.",
  },
  {
    label: "Riesgo crítico",
    value: "CRITICAL",
    description: "Toca identidad, crédito o dinero, o borra datos.",
  },
];

export const reviewOptions = [
  {
    label: "Auto detectado",
    value: "AUTO_DETECTED",
    description: "Lo detectó el descubrimiento y nadie lo ha revisado.",
  },
  {
    label: "Necesita revisión",
    value: "NEEDS_REVIEW",
    description: "Espera que una persona confirme su ficha.",
  },
  {
    label: "Aprobado",
    value: "APPROVED",
    description: "Una persona revisó y aprobó su ficha.",
  },
  {
    label: "Rechazado",
    value: "REJECTED",
    description: "Una persona rechazó su ficha: hay que corregirla.",
  },
];
