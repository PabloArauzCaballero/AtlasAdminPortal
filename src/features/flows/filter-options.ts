import type { Option } from "@/shared/lib/options";

/** Las opciones de los filtros del mapa de rutas: catálogos fijos, con su significado. */

export const RISK_OPTIONS: Option[] = [
  {
    value: "CRITICAL",
    label: "CRITICAL",
    description: "Escribe en identidad, crédito o dinero, o borra datos.",
  },
  {
    value: "HIGH",
    label: "HIGH",
    description: "Modifica datos importantes o sensibles.",
  },
  {
    value: "MEDIUM",
    label: "MEDIUM",
    description: "Modifica datos de operación corriente.",
  },
  {
    value: "LOW",
    label: "LOW",
    description: "Sólo lee o navega: no cambia nada.",
  },
];

export const SYSTEM_OPTIONS: Option[] = [
  {
    value: "ATLAS_BACKEND",
    label: "ATLAS_BACKEND",
    description: "El núcleo de Atlas: clientes, crédito, pagos y operaciones.",
  },
  {
    value: "DECISION_ENGINE",
    label: "DECISION_ENGINE",
    description: "El Motor de decisiones: identidad, riesgo y tasa.",
  },
  {
    value: "ERP_BACKEND",
    label: "ERP_BACKEND",
    description: "El ERP de los comercios.",
  },
  {
    value: "DASHBOARDS",
    label: "DASHBOARDS",
    description: "Los tableros de indicadores.",
  },
];

export const CLIENT_OPTIONS: Option[] = [
  {
    value: "ADMIN_PORTAL",
    label: "ADMIN_PORTAL",
    description: "Rutas que llama el portal interno.",
  },
  {
    value: "MOTOR_PORTAL",
    label: "MOTOR_PORTAL",
    description: "Rutas que llama el portal del Motor de decisiones.",
  },
  {
    value: "ERP_PORTAL",
    label: "ERP_PORTAL",
    description: "Rutas que llama el portal del ERP.",
  },
  {
    value: "DASHBOARDS_PORTAL",
    label: "DASHBOARDS_PORTAL",
    description: "Rutas que llaman los tableros.",
  },
  {
    value: "CONSUMER_APP",
    label: "CONSUMER_APP",
    description: "Rutas que llama la app del cliente.",
  },
  ...SYSTEM_OPTIONS.map((option) => ({
    ...option,
    description: `Rutas que llama otro bloque: ${option.label}.`,
  })),
];

export const TESTED_OPTIONS: Option[] = [
  {
    value: "true",
    label: "Con test",
    description: "Una prueba automática ejercita esta operación.",
  },
  {
    value: "false",
    label: "Sin test",
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
    label: "UNVERIFIED",
    description: "Nadie la ha llamado de verdad en la ventana medida.",
  },
  {
    value: "VERIFIED",
    label: "VERIFIED",
    description: "Se llamó de verdad y respondió como el mapa dice.",
  },
  {
    value: "BROKEN",
    label: "BROKEN",
    description: "Una corrida real contradijo el mapa.",
  },
];

export const FINDING_KIND_OPTIONS: Option[] = [
  {
    value: "UNPROTECTED_WRITE",
    label: "UNPROTECTED_WRITE",
    description: "Una escritura sin guarda de autorización.",
  },
  {
    value: "CONTRACT_DRIFT",
    label: "CONTRACT_DRIFT",
    description: "El contrato declarado no coincide con lo que hace el código.",
  },
  {
    value: "JWT_ONLY_NO_ROLE",
    label: "JWT_ONLY_NO_ROLE",
    description: "Exige sesión pero ningún rol ni permiso concreto.",
  },
  {
    value: "CLIENT_CALL_UNMATCHED",
    label: "CLIENT_CALL_UNMATCHED",
    description: "Un cliente llama a una ruta que no existe en el mapa.",
  },
  {
    value: "UNTESTED_WRITE",
    label: "UNTESTED_WRITE",
    description: "Una escritura que ninguna prueba ejercita.",
  },
  {
    value: "ORPHAN_ENDPOINT",
    label: "ORPHAN_ENDPOINT",
    description: "Una ruta que ningún cliente llama.",
  },
  {
    value: "RBAC_UNRESOLVED",
    label: "RBAC_UNRESOLVED",
    description: "No se pudo resolver qué permiso exige la ruta.",
  },
];
