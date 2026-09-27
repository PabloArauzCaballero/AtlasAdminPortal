import type { Option } from "@/shared/lib/options";

export const typeOptions: Option[] = [
  {
    label: "Todos",
    value: "all",
    description: "Muestra las seis secciones de la cola a la vez.",
  },
  {
    label: "Endpoints",
    value: "endpoints",
    description: "Rutas del sistema detectadas al escanear el código.",
  },
  {
    label: "Tablas",
    value: "data_entities",
    description: "Tablas de la base que el escáner encontró y clasificó.",
  },
  {
    label: "Columnas",
    value: "data_column_impacts",
    description:
      "Columnas de cada tabla con su clasificación de datos personales.",
  },
  {
    label: "Impacto tabla",
    value: "data_impacts",
    description: "Qué ruta lee o escribe qué tabla, según el escáner.",
  },
  {
    label: "Impacto campo",
    value: "field_impacts",
    description: "Qué ruta toca qué campo concreto de una tabla.",
  },
  {
    label: "Herramientas",
    value: "tool_requirements",
    description:
      "Servicios externos o internos que una ruta necesita para funcionar.",
  },
];

export const reviewOptions: Option[] = [
  {
    label: "AUTO_DETECTED",
    value: "AUTO_DETECTED",
    description: "Lo encontró el escáner y nadie lo ha mirado todavía.",
  },
  {
    label: "NEEDS_REVIEW",
    value: "NEEDS_REVIEW",
    description: "Pendiente de que una persona lo confirme o lo descarte.",
  },
  {
    label: "APPROVED",
    value: "APPROVED",
    description: "Una persona confirmó que la detección es correcta.",
  },
  {
    label: "REJECTED",
    value: "REJECTED",
    description: "Una persona descartó la detección por incorrecta.",
  },
];
