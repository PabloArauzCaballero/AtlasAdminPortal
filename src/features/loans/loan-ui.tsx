"use client";

import { Badge } from "@/shared/components/ui/badges";
import { formatAmount } from "@/shared/lib/format";
import { estadoCartera } from "./loan-labels";

/** Estado del libro en español, con el tono de su gravedad. */
export function EstadoCartera({
  value,
}: Readonly<{ value: string | null | undefined }>) {
  const estado = estadoCartera(value);
  return (
    <Badge tone={estado.tone} dot>
      {estado.label}
    </Badge>
  );
}

/**
 * Un importe con su moneda y cifras tabulares: en una columna de dinero los dígitos tienen que
 * caer uno debajo del otro para compararlos de un vistazo.
 */
export function Importe({
  value,
  currency,
}: Readonly<{ value: string | number | null | undefined; currency?: string }>) {
  const texto = formatAmount(value);
  return (
    <span className="whitespace-nowrap tabular-nums">
      {texto}
      {currency && texto !== "—" ? (
        <span className="ml-1 text-xs text-atlas-muted">{currency}</span>
      ) : null}
    </span>
  );
}

/** Tasa guardada como fracción (`0.05`) → «5 %». */
export function formatRate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(numeric * 100)} %`;
}

/** Guarda un archivo ya descargado con el nombre que propuso el servidor. */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
