import type { Option } from "@/shared/lib/options";
import { ESTADOS, SEVERIDADES } from "../finding-codes";
import type { Severity } from "../types";

const DESCRIPCION_DE_GRAVEDAD: Record<Severity, string> = {
  CRITICAL:
    "Bloquea habilitar proveedores en producción: hay que resolverlo antes.",
  HIGH: "Es grave y pide corrección pronto, aunque no frena por sí solo la compuerta.",
  MEDIUM: "Conviene corregirlo, pero no pone en riesgo la operación de hoy.",
  LOW: "Es una observación menor: se atiende cuando haya oportunidad.",
};

/** Los cuatro niveles de gravedad de un hallazgo, del catálogo fijo del portal. */
export const SEVERITY_OPTIONS: Option[] = (
  Object.keys(SEVERIDADES) as Severity[]
).map((value) => ({
  value,
  label: SEVERIDADES[value].label,
  description: DESCRIPCION_DE_GRAVEDAD[value],
}));

/** Los estados con que puede acabar una solicitud, con su explicación. */
export const RESPONSE_STATUS_OPTIONS: Option[] = Object.entries(ESTADOS).map(
  ([value, estado]) => ({
    value,
    label: estado.label,
    description: estado.summary,
  }),
);

export const HEALTH_OPTIONS: Option[] = [
  {
    value: "UP",
    label: "Responde",
    description: "La última comprobación de salud del proveedor fue buena.",
  },
  {
    value: "DEGRADED",
    label: "Degradado",
    description: "Responde, pero con fallos o lentitud.",
  },
  {
    value: "DOWN",
    label: "Caído",
    description: "La última comprobación de salud falló.",
  },
  {
    value: "UNKNOWN",
    label: "Sin medir",
    description: "Nadie ha comprobado su salud todavía.",
  },
];

export const MODE_OPTIONS: Option[] = [
  {
    value: "mock_local",
    label: "Simulado local",
    description: "Responde un simulador dentro del propio servidor.",
  },
  {
    value: "mock_server",
    label: "Simulado servidor",
    description: "Responde el servidor de simulación de proveedores.",
  },
  {
    value: "sandbox",
    label: "Sandbox",
    description: "Se llama al entorno de pruebas del proveedor.",
  },
  {
    value: "production",
    label: "Producción",
    description:
      "Se llama al proveedor real: el único modo cuyo dato vale para decidir.",
  },
  {
    value: "disabled",
    label: "Deshabilitado",
    description: "No se le llama.",
  },
];

export const STATUS_OPTIONS: Option[] = [
  {
    value: "ACTIVE",
    label: "Activo",
    description: "Se le puede llamar con todo su alcance.",
  },
  {
    value: "DISABLED",
    label: "Deshabilitado",
    description: "No se le llama bajo ninguna circunstancia.",
  },
  {
    value: "MOCK_ONLY",
    label: "Sólo simulado",
    description: "Sólo responde un simulador: no sale a la red.",
  },
  {
    value: "SANDBOX_ONLY",
    label: "Sólo sandbox",
    description: "Sólo se le llama en su entorno de pruebas.",
  },
];

/** Sí/no para las columnas booleanas de los informes. */
export const yesNoOptions = (yes: string, no: string): Option[] => [
  { value: "yes", label: "Sí", description: yes },
  { value: "no", label: "No", description: no },
];
