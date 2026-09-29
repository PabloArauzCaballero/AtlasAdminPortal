import type { Option } from "@/shared/lib/options";
import { prioridad, sujeto } from "./labels";
import type { SupportCodeOption, SupportQueue } from "./types";

/**
 * Las listas de la mesa de soporte, con lo que significa cada opción.
 *
 * Las colas y los códigos llegan del servidor: una cola es una ENTIDAD, así que su descripción es
 * su ficha (a quién atiende · prioridad por defecto) y no un texto inventado. Los códigos de
 * resolución y prioridad traen su propia explicación en `label`, que es justo la descripción.
 */
export function queueOptions(
  queues: SupportQueue[],
  key: "queueCode" | "queueId",
): Option[] {
  return queues.map((cola) => ({
    value: cola[key],
    label: cola.name,
    description:
      cola.description ??
      `Atiende a ${sujeto(cola.contextType)} · prioridad por defecto ${prioridad(cola.defaultPriority).label}`,
  }));
}

/**
 * Los códigos de resolución, causa raíz y prioridad llegan con su explicación en `label`.
 *
 * El código (`APPLICATION_DEFECT`) no se enseña: es el nombre interno. Si hay un nombre corto
 * propio (la prioridad: «P1 · Crítica») va de etiqueta y la explicación debajo; si no, la
 * explicación del catálogo ES la etiqueta.
 */
export function codeOptions(
  codes: SupportCodeOption[],
  nombre?: (code: string) => string,
): Option[] {
  return codes.map((codigo) => ({
    value: codigo.code,
    label: nombre ? nombre(codigo.code) : sinPuntoFinal(codigo.label),
    description: nombre ? codigo.label : undefined,
  }));
}

function sinPuntoFinal(texto: string): string {
  return texto.trim().replace(/\.$/, "");
}

/** El filtro de causa raíz, con TODAS las causas que el catálogo del servidor conoce. */
export function causaRaizFiltroOptions(codes: SupportCodeOption[]): Option[] {
  return [CUALQUIER_CAUSA, ...codeOptions(codes)];
}

const CUALQUIER_CAUSA: Option = {
  value: "",
  label: "Cualquiera",
  description: "Sin filtrar por causa raíz, resueltos o no.",
};

export const SIN_CAMBIAR: Option = {
  value: "",
  label: "Sin cambiar",
  description: "Deja este dato del caso tal como está ahora.",
};

export const PRESENCIA_OPTIONS: Option[] = [
  {
    value: "AVAILABLE",
    label: "Disponible",
    description: "Recibes conversaciones nuevas hasta llenar tu capacidad.",
  },
  {
    value: "BUSY",
    label: "Ocupado",
    description: "Sigues con lo tuyo pero no te llegan conversaciones nuevas.",
  },
  {
    value: "AWAY",
    label: "Ausente",
    description: "Fuera de tu puesto un rato; el reparto te salta.",
  },
  {
    value: "WRAP_UP",
    label: "Cerrando",
    description: "Terminando notas de la última atención antes de tomar otra.",
  },
  {
    value: "TRAINING",
    label: "En formación",
    description: "En capacitación; no cuentas como capacidad de la mesa.",
  },
  {
    value: "OFFLINE",
    label: "Desconectado",
    description: "Fuera de turno: no recibes nada hasta volver a conectarte.",
  },
];

export const NIVEL_OPTIONS: Option[] = [
  {
    value: "L1",
    label: "Primera línea (L1)",
    description: "Primera línea: atiende y resuelve lo frecuente del cliente.",
  },
  {
    value: "L2",
    label: "Segunda línea (L2)",
    description: "Segunda línea: recibe lo que L1 no puede cerrar.",
  },
  {
    value: "SPECIALIST",
    label: "Especialista",
    description: "Experto de un dominio (pagos, identidad) al que se deriva.",
  },
  {
    value: "SUPERVISOR",
    label: "Supervisor",
    description: "Ve todos los casos de su equipo y recibe los escalados.",
  },
  {
    value: "MANAGER",
    label: "Responsable",
    description: "Dirige la mesa; ve todo y decide los escalados jerárquicos.",
  },
];

export const CUALQUIER_COLA: Option = {
  value: "",
  label: "Cualquiera",
  description: "Sin cola fija: el reparto le asigna casos de todas.",
};

export const CAPACIDAD_OPTIONS: Option[] = [1, 2, 3, 4, 5, 6, 8, 10].map(
  (valor) => ({
    value: String(valor),
    label: String(valor),
    description:
      valor === 1
        ? "Una conversación a la vez; para quien está aprendiendo."
        : `Hasta ${valor} conversaciones abiertas a la vez antes de dejar de recibir.`,
  }),
);

export const TIPO_ESCALADO_OPTIONS: Option[] = [
  {
    value: "FUNCTIONAL",
    label: "Funcional (hace falta otro equipo)",
    description: "El caso necesita a otro equipo con el conocimiento técnico.",
  },
  {
    value: "HIERARCHICAL",
    label: "Jerárquico (hace falta un supervisor)",
    description: "Hace falta la autoridad de un supervisor para decidir.",
  },
  {
    value: "SECURITY",
    label: "Seguridad",
    description: "Posible acceso indebido o cuenta comprometida del cliente.",
  },
  {
    value: "FRAUD",
    label: "Fraude",
    description: "Señales de fraude: pasa al equipo que investiga fraude.",
  },
  {
    value: "PRIVACY",
    label: "Privacidad",
    description: "Pedido o incidente sobre datos personales del cliente.",
  },
];
