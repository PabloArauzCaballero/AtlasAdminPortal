import type { Option } from "@/shared/lib/options";

/** Las opciones de los filtros del mapa de rutas: catálogos fijos, con su significado. */

export const RISK_OPTIONS: Option[] = [
  {
    value: "CRITICAL",
    label: "Crítico",
    description: "Escribe en identidad, crédito o dinero, o borra datos.",
  },
  {
    value: "HIGH",
    label: "Alto",
    description: "Modifica datos importantes o sensibles.",
  },
  {
    value: "MEDIUM",
    label: "Medio",
    description: "Modifica datos de operación corriente.",
  },
  {
    value: "LOW",
    label: "Bajo",
    description: "Sólo lee o navega: no cambia nada.",
  },
];

export const SYSTEM_OPTIONS: Option[] = [
  {
    value: "ATLAS_BACKEND",
    label: "Núcleo de Atlas",
    description: "El núcleo de Atlas: clientes, crédito, pagos y operaciones.",
  },
  {
    value: "DECISION_ENGINE",
    label: "Motor de decisiones",
    description: "El Motor de decisiones: identidad, riesgo y tasa.",
  },
  {
    value: "ERP_BACKEND",
    label: "ERP",
    description: "El ERP de los comercios.",
  },
  {
    value: "DASHBOARDS",
    label: "Tableros",
    description: "Los tableros de indicadores.",
  },
];

export const CLIENT_OPTIONS: Option[] = [
  {
    value: "ADMIN_PORTAL",
    label: "Portal interno",
    description: "Rutas que llama el portal interno.",
  },
  {
    value: "MOTOR_PORTAL",
    label: "Portal del Motor",
    description: "Rutas que llama el portal del Motor de decisiones.",
  },
  {
    value: "ERP_PORTAL",
    label: "Portal del ERP",
    description: "Rutas que llama el portal del ERP.",
  },
  {
    value: "DASHBOARDS_PORTAL",
    label: "Portal de tableros",
    description: "Rutas que llaman los tableros.",
  },
  {
    value: "CONSUMER_APP",
    label: "App del cliente",
    description: "Rutas que llama la app del cliente.",
  },
  ...SYSTEM_OPTIONS.map((option) => ({
    ...option,
    description: `Rutas que llama otro sistema: ${option.label}.`,
  })),
];

export const TESTED_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Con pruebas",
    description: "Una prueba automática ejercita esta operación.",
  },
  {
    value: "false",
    label: "Sin pruebas",
    description: "Ninguna prueba automática la ejercita.",
  },
];

export const WITH_FINDINGS_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Con hallazgos",
    description: "Tiene al menos un hallazgo abierto de los detectores.",
  },
  {
    value: "false",
    label: "Sin hallazgos",
    description: "Ningún detector encontró nada en ella.",
  },
];

export const VERIFICATION_OPTIONS: Option[] = [
  {
    value: "UNVERIFIED",
    label: "Sin verificar",
    description: "Nadie la ha llamado de verdad en la ventana medida.",
  },
  {
    value: "VERIFIED",
    label: "Verificada",
    description: "Se llamó de verdad y respondió como el mapa dice.",
  },
  {
    value: "BROKEN",
    label: "Rota",
    description: "Una corrida real contradijo el mapa.",
  },
];

export const FRESHNESS_OPTIONS: Option[] = [
  {
    value: "STALE",
    label: "Desactualizada",
    description: "Cambió su código desde la última verificación.",
  },
  {
    value: "FRESH",
    label: "Al día",
    description: "Su código no cambió desde la última verificación.",
  },
];

export const FINDING_KIND_OPTIONS: Option[] = [
  {
    value: "UNPROTECTED_WRITE",
    label: "Escritura sin protección",
    description: "Una escritura sin guarda de autorización.",
  },
  {
    value: "CONTRACT_DRIFT",
    label: "Contrato desalineado",
    description: "El contrato declarado no coincide con lo que hace el código.",
  },
  {
    value: "JWT_ONLY_NO_ROLE",
    label: "Sólo exige sesión",
    description: "Exige sesión pero ningún rol ni permiso concreto.",
  },
  {
    value: "CLIENT_CALL_UNMATCHED",
    label: "Llamada a una ruta inexistente",
    description: "Un cliente llama a una ruta que no existe en el mapa.",
  },
  {
    value: "UNTESTED_WRITE",
    label: "Escritura sin pruebas",
    description: "Una escritura que ninguna prueba ejercita.",
  },
  {
    value: "ORPHAN_ENDPOINT",
    label: "Ruta que nadie llama",
    description: "Una ruta que ningún cliente llama.",
  },
  {
    value: "RBAC_UNRESOLVED",
    label: "Permiso sin resolver",
    description: "No se pudo resolver qué permiso exige la ruta.",
  },
  {
    value: "PROCESS_STEP_UNWIRED",
    label: "Paso de proceso sin pantalla que lo use",
    description:
      "Un paso de un proceso de negocio que ninguna pantalla llama: nadie puede hacerlo desde el portal.",
  },
];

/** El nombre en palabras de un código, o el propio código si el catálogo no lo conoce todavía. */
export function labelFrom(
  options: readonly Option[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}
