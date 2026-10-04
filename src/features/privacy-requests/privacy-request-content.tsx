"use client";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { formatDateTime } from "@/shared/lib/format";
import {
  IDENTITY_RECTIFICATION_FIELDS,
  rectificationFieldLabel,
} from "./labels";
import type { PrivacyRequestDetail } from "./types";

/**
 * Lo que pidió la persona: el texto, qué dato y el valor correcto, y si confirmó su PIN.
 *
 * Hasta el 2026-10-04 nada de esto se guardaba y la cola recibía «quiere corregir algo» sin saber qué. El valor propuesto
 * llega descifrado sólo en el detalle, y verlo deja constancia en la auditoría: por eso se avisa.
 */
export function PrivacyRequestContent({
  solicitud,
}: Readonly<{ solicitud: PrivacyRequestDetail }>) {
  const esCorreccion = solicitud.requestType === "rectification";
  const esIdentidad = IDENTITY_RECTIFICATION_FIELDS.has(
    solicitud.rectificationField ?? "",
  );
  const antigua =
    !solicitud.description &&
    !solicitud.rectificationField &&
    !solicitud.hasProposedValue;

  const items = [
    ...(esCorreccion
      ? [
          {
            label: "Qué dato corregir",
            value: rectificationFieldLabel(solicitud.rectificationField),
          },
          {
            label: "Valor correcto",
            value: solicitud.proposedValue
              ? solicitud.proposedValue
              : solicitud.hasProposedValue
                ? "No se pudo leer el valor (sobre cifrado ilegible)."
                : "No lo indicó",
          },
        ]
      : []),
    {
      label: "Lo que escribió",
      value: solicitud.description ?? "No escribió nada.",
    },
    {
      label: "Confirmó su PIN",
      value: solicitud.pinVerifiedAt
        ? `Sí, ${formatDateTime(solicitud.pinVerifiedAt)}`
        : "No. Antes de actuar, confirma por otro canal que es el titular.",
    },
  ];

  return (
    <div className="space-y-3" data-testid="lo-que-pidio">
      <KeyValueSection
        title="Lo que pidió"
        description={
          antigua
            ? "Esta solicitud es anterior al 4 de octubre de 2026: la app no guardaba qué pedía. Hay que preguntárselo al cliente."
            : "El dato y el valor que propone la persona. Ver el valor queda registrado en la auditoría."
        }
        items={items}
      />
      {esCorreccion && esIdentidad ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Es un dato del carnet: antes de cambiarlo pide una foto del documento
          y actualiza la diligencia debida del cliente (DS 4904).
        </p>
      ) : null}
    </div>
  );
}
