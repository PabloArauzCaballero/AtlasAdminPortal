/**
 * Cómo se DICE en pantalla el estado de cada sistema y de su catálogo.
 *
 * El backend habla en códigos (`NEVER_RUN`, `NOT_CONFIGURED`…) y en mensajes pensados para quien
 * depura: nombres de variables de entorno, direcciones internas. Nada de eso es lenguaje de quien
 * abre esta pantalla. Aquí se traduce una sola vez, para que la tarjeta, el aviso y el resultado de
 * «Actualizar catálogos» digan lo mismo con las mismas palabras. El mensaje técnico no se pierde: la
 * tarjeta lo guarda plegado bajo «Detalle técnico», para soporte.
 */
import type { NetworkBlockHealth } from "@/features/systems/types";

export type StatusTone = "success" | "critical" | "warning" | "muted" | "info";

type StatusCopy = { label: string; tone: StatusTone; explanation: string };

const SELF_COPY: Record<string, StatusCopy> = {
  SELF_INTROSPECTED: {
    label: "Catálogo al día",
    tone: "success",
    explanation:
      "Lee sus propias rutas al arrancar y cada pocas horas, sin que nadie tenga que pedirlo.",
  },
  NEVER_RUN: {
    label: "Sin leer todavía",
    tone: "muted",
    explanation:
      "Todavía no ha leído sus propias rutas. Lo hace solo poco después de arrancar; si acaba de desplegarse, espera un minuto.",
  },
  ERROR: {
    label: "Falló la lectura",
    tone: "critical",
    explanation:
      "Intentó leer sus propias rutas y no pudo. Avisa a soporte con el detalle técnico.",
  },
};

const FEDERATED_COPY: Record<string, StatusCopy> = {
  OK: {
    label: "Catálogo al día",
    tone: "success",
    explanation: "Entregó su lista de rutas y tablas en la última lectura.",
  },
  NEVER_RUN: {
    label: "Sin leer todavía",
    tone: "muted",
    explanation:
      "Aún no se le ha pedido su catálogo. Atlas lo pide solo al arrancar y cada pocas horas; también puedes pedirlo ahora con «Actualizar catálogos».",
  },
  NOT_CONFIGURED: {
    label: "Falta configurar",
    tone: "warning",
    explanation:
      "Atlas no tiene la dirección o la credencial para pedirle su catálogo. Es un ajuste del despliegue: avisa a quien administra los servidores.",
  },
  UNREACHABLE: {
    label: "No contestó",
    tone: "critical",
    explanation:
      "Se le pidió su catálogo y no contestó. Puede estar caído o no ser alcanzable desde Atlas.",
  },
  UNAUTHORIZED: {
    label: "Credencial rechazada",
    tone: "critical",
    explanation:
      "Rechazó la credencial con la que Atlas le pidió su catálogo: no es la suya o ya no vale.",
  },
  INVALID_MANIFEST: {
    label: "Formato no reconocido",
    tone: "warning",
    explanation:
      "Contestó, pero con un formato que Atlas no reconoce: las versiones de los dos sistemas no están alineadas.",
  },
  ERROR: {
    label: "Falló la lectura",
    tone: "critical",
    explanation:
      "Falló al leer su catálogo. Avisa a soporte con el detalle técnico.",
  },
};

const UNKNOWN: StatusCopy = {
  label: "Estado desconocido",
  tone: "muted",
  explanation:
    "El estado de su catálogo no es uno de los conocidos. Avisa a soporte con el detalle técnico.",
};

/** Estados con los que el catálogo de un sistema cuenta como al día. */
const UP_TO_DATE = new Set(["OK", "SELF_INTROSPECTED"]);

export function catalogStatusCopy(kind: string, status: string): StatusCopy {
  const table = kind === "SELF" ? SELF_COPY : FEDERATED_COPY;
  return table[status] ?? FEDERATED_COPY[status] ?? UNKNOWN;
}

export function isCatalogUpToDate(status: string): boolean {
  return UP_TO_DATE.has(status);
}

/** Nombres con los que la operación conoce a cada sistema, no los del repositorio. */
const DISPLAY_NAMES: Record<string, string> = {
  ATLAS_BACKEND: "Núcleo de Atlas",
  DECISION_ENGINE: "Motor de decisiones",
  ERP_BACKEND: "ERP",
};

export function blockDisplayName(
  block: Pick<NetworkBlockHealth, "systemCode" | "name">,
): string {
  return DISPLAY_NAMES[block.systemCode] ?? block.name;
}

/**
 * Si los contadores de un sistema son una medición.
 *
 * Un backend anterior no manda `measured`; entonces vale lo que diga la última lectura correcta.
 * Sin ninguna, un «0» no es cero: es que nadie ha contado.
 */
export function isCatalogMeasured(block: NetworkBlockHealth): boolean {
  return block.catalog.measured ?? Boolean(block.catalog.lastSuccessAt);
}

/** «Sin medir» en lugar de un cero que nadie midió; el número tal cual en cualquier otro caso. */
export function catalogCountText(value: number, measured: boolean): string {
  return value === 0 && !measured ? "Sin medir" : String(value);
}

export function pluralSystems(count: number): string {
  return count === 1 ? "1 sistema" : `${count} sistemas`;
}
