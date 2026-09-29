import type {
  PendingContactVerificationItem,
  ResendContactVerificationResult,
} from "./types";

export type ResendNotice = { tone: "ok" | "error"; text: string };

const CANAL: Record<string, string> = {
  sms: "SMS",
  email: "correo",
  whatsapp: "WhatsApp",
};

/**
 * El aviso tras reenviar el código, con lo que dijo el servidor y no con lo que se esperaba.
 *
 * Antes cualquier 200 se pintaba como «SMS reenviado: se envió un código nuevo», pero el servidor
 * responde 200 también cuando el proveedor NO entregó (`deliveryStatus: 'delivery_failed'`): el
 * operador daba por atendido a un cliente al que no le llegó nada.
 */
export function resendNotice(
  item: PendingContactVerificationItem,
  result: ResendContactVerificationResult | undefined,
): ResendNotice {
  const cliente = item.customerCode ?? item.customerId;
  if (result?.deliveryStatus === "delivery_failed") {
    return {
      tone: "error",
      text: `El proveedor no pudo entregar el código al cliente ${cliente}. No le llegó nada: inténtalo de nuevo en unos minutos o revisa el contacto.`,
    };
  }
  if (result?.deliveryStatus === "sent") {
    const canal =
      CANAL[result.deliveredChannel ?? ""] ??
      (item.contactType === "phone" ? "SMS" : "correo");
    return {
      tone: "ok",
      text: `El proveedor aceptó el envío del código por ${canal} al cliente ${cliente}.`,
    };
  }
  // Sin `deliveryStatus` (un servidor anterior) no se sabe si salió: se dice sólo lo que consta.
  return {
    tone: "ok",
    text: `Se pidió un código nuevo para el cliente ${cliente}; el servidor no confirmó si el proveedor lo entregó.`,
  };
}
