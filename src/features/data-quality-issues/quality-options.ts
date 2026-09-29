import type { Option } from "@/shared/lib/options";

/*
 * Opciones FIJAS, no sacadas de la página: un desplegable armado con las 20 filas visibles no ofrece
 * «Crítica» si las críticas están en la página 3. Son los valores que AtlasBackend compara en
 * mayúsculas a los dos lados (la siembra guarda `critical` en minúscula).
 */
export const SEVERITY_OPTIONS: Option[] = [
  {
    value: "CRITICAL",
    label: "Crítica",
    description: "La regla marca un dato que no puede quedar así.",
  },
  {
    value: "HIGH",
    label: "Alta",
    description: "Conviene revisarla hoy mismo.",
  },
  {
    value: "MEDIUM",
    label: "Media",
    description: "Revisar en la operación normal.",
  },
  {
    value: "LOW",
    label: "Baja",
    description: "Informativa; no bloquea nada por sí sola.",
  },
];

/** Estados de una incidencia. «Reconocida» sigue pendiente: reconocer no corrige el dato. */
export const ISSUE_STATUS_OPTIONS: Option[] = [
  {
    value: "open",
    label: "Sin revisar",
    description: "Nadie la ha mirado todavía; cuenta como pendiente.",
  },
  {
    value: "acknowledged",
    label: "Reconocida",
    description:
      "Alguien confirmó con motivo que es real; sigue pendiente de corregir.",
  },
  {
    value: "resolved",
    label: "Corregida",
    description: "El dato se corrigió y la incidencia quedó cerrada.",
  },
  {
    value: "ignored",
    label: "Descartada",
    description: "Se cerró sin corregir porque no hacía falta, con motivo.",
  },
];

/** Estado de la DEFINICIÓN de una regla. Las reglas no se ejecutan: no hay estado de ejecución. */
export const RULE_STATUS_OPTIONS: Option[] = [
  {
    value: "ACTIVE",
    label: "Activa",
    description: "La regla está encendida en el catálogo de calidad.",
  },
  {
    value: "INACTIVE",
    label: "Apagada",
    description: "La regla existe pero está apagada; no cuenta como control.",
  },
];
