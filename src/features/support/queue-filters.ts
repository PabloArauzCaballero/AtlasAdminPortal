import type { Option } from "@/shared/lib/options";
import { tipoCaso } from "./labels";
import type { SupportCategory } from "./types";

/**
 * Los catálogos de la barra de filtros de la bandeja de soporte.
 *
 * Todos son fijos o vienen del servidor (colas, motivos, códigos): ninguno se arma con los casos
 * de la página cargada, porque entonces el filtro sólo ofrecería lo que ya se está viendo.
 */

/**
 * Todo lo que sigue vivo. `ON_HOLD` y `REOPENED` también: sin ellos un caso en pausa o reabierto
 * no salía en ninguna vista y desaparecía de la bandeja justo cuando alguien tenía que retomarlo.
 */
export const ESTADOS_ABIERTOS =
  "NEW,TRIAGED,ASSIGNED,IN_PROGRESS,WAITING_CUSTOMER,WAITING_INTERNAL,WAITING_PARTNER,ESCALATED,ON_HOLD,REOPENED";

/**
 * «Todas las etapas» se manda EXPLÍCITA. Sin `status` el servidor aplica su propia lista de
 * abiertos, que no es «todas»: la opción diría una cosa y la tabla enseñaría otra.
 */
export const TODOS_LOS_ESTADOS = `${ESTADOS_ABIERTOS},RESOLVED,CLOSED,DUPLICATE,CANCELLED`;

export const VISTAS: Option[] = [
  {
    label: "Abiertos (todos)",
    value: ESTADOS_ABIERTOS,
    description: "Todo lo que aún no está resuelto, en cualquier etapa.",
  },
  {
    label: "Sin clasificar",
    value: "NEW",
    description: "Recién llegados: nadie les puso motivo ni prioridad todavía.",
  },
  {
    label: "En curso",
    value: "ASSIGNED,IN_PROGRESS",
    description: "Ya tienen agente y alguien está trabajando en ellos.",
  },
  {
    label: "Esperando a alguien",
    value: "WAITING_CUSTOMER,WAITING_INTERNAL,WAITING_PARTNER",
    description:
      "Parados hasta que responda el cliente, otro equipo o un socio.",
  },
  {
    label: "Escalados",
    value: "ESCALATED",
    description: "Pasados a otro equipo o a un supervisor para decidir.",
  },
  {
    label: "Reabiertos",
    value: "REOPENED",
    description:
      "Se dieron por resueltos y el problema volvió: hay que retomarlos.",
  },
  {
    label: "En pausa",
    value: "ON_HOLD",
    description:
      "Detenidos a propósito hasta que algo cambie; nadie los atiende ahora.",
  },
  {
    label: "Resueltos y cerrados",
    value: "RESOLVED,CLOSED",
    description: "Terminados; aquí sirven los filtros de resolución y causa.",
  },
  {
    label: "Duplicados y cancelados",
    value: "DUPLICATE,CANCELLED",
    description:
      "Unidos a otro caso por ser el mismo problema, o anulados sin atender.",
  },
];

/** Qué cubre cada tipo de caso. Las claves son el enum `SUPPORT_CASE_TYPES` del servidor. */
const QUE_CUBRE: Record<string, string> = {
  QUESTION: "Dudas sobre cómo funciona algo, sin nada roto.",
  SERVICE_REQUEST: "Piden que el equipo haga algo por ellos.",
  TECHNICAL_INCIDENT: "Algo de la app o del portal no funciona.",
  ACCOUNT_ACCESS: "No pueden entrar, o perdieron su contraseña o código.",
  IDENTITY_KYC: "Problemas al validar el carnet o la selfie.",
  CREDIT_DECISION_EXPLANATION:
    "Quieren saber por qué se decidió así su crédito.",
  PURCHASE_SUPPORT: "Dudas o problemas con una compra en cuotas.",
  PAYMENT_EVIDENCE: "Enviaron o discuten un comprobante de pago.",
  QR_SUPPORT: "Problemas al cobrar o pagar con código QR.",
  PARTNER_ONBOARDING: "Un comercio con dudas o trabas en su alta.",
  PARTNER_OPERATION: "Un comercio con problemas en su operación diaria.",
  RECONCILIATION_SUPPORT: "Diferencias entre lo cobrado y lo liquidado.",
  BILLING_MDR_SUPPORT:
    "Dudas sobre facturas o comisiones cobradas al comercio.",
  COMPLAINT: "Queja formal sobre el servicio recibido.",
  PRIVACY_REQUEST: "Ejercicio de derechos sobre sus datos personales.",
  SECURITY_INCIDENT: "Sospecha de acceso indebido o fuga de datos.",
  FRAUD_REPORT: "Aviso de una operación que el cliente no reconoce.",
  BUG_REPORT: "Un fallo del producto reproducible y descrito.",
  FEATURE_REQUEST: "Una mejora que el cliente o el comercio propone.",
  DATA_CORRECTION_REQUEST: "Piden corregir un dato que Atlas tiene mal.",
  OTHER: "Lo que no encaja en ningún otro tipo de caso.",
};

export const TIPO_CASO_OPTIONS: Option[] = Object.entries(QUE_CUBRE).map(
  ([value, description]) => ({ value, label: tipoCaso(value), description }),
);

export const PRIORIDAD_OPTIONS: Option[] = [
  {
    value: "P1",
    label: "P1 · Crítica",
    description: "Crítica: el cliente no puede operar; se atiende ya.",
  },
  {
    value: "P2",
    label: "P2 · Alta",
    description: "Alta: afecta a una operación importante del cliente.",
  },
  {
    value: "P3",
    label: "P3 · Normal",
    description: "Normal: molesta pero el cliente puede seguir operando.",
  },
  {
    value: "P4",
    label: "P4 · Baja",
    description: "Baja: consulta o mejora sin impacto en la operación.",
  },
];

/** Una sola opción: «Toda la cola» es la opción vacía que ya pone la barra de filtros. */
export const SOLO_MIOS_OPTIONS: Option[] = [
  {
    value: "mios",
    label: "Sólo los míos",
    description: "Sólo los casos asignados a ti ahora mismo.",
  },
];

/** Los motivos del catálogo del servidor, con sus submotivos aplanados debajo. */
export function motivoOptions(
  categorias: readonly SupportCategory[],
): Option[] {
  return categorias.flatMap((categoria) => [
    {
      value: categoria.categoryCode,
      label: categoria.label,
      description:
        categoria.description ??
        `Casos abiertos con el motivo ${categoria.label}.`,
    },
    ...motivoOptions(categoria.subcategories ?? []),
  ]);
}
