export const typeOptions = [
  { label: "Todos", value: "all" },
  { label: "Endpoints", value: "endpoints" },
  { label: "Tablas", value: "data_entities" },
  { label: "Impacto tabla", value: "data_impacts" },
  { label: "Impacto campo", value: "field_impacts" },
  { label: "Herramientas", value: "tool_requirements" },
];

export const reviewOptions = [
  "AUTO_DETECTED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
].map((value) => ({ label: value, value }));
