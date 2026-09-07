export function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (match) => match.toUpperCase());
}

export function formatBoolean(value: boolean | null | undefined): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "—";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function formatNumber(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat("es-BO").format(numeric);
}

/**
 * Un importe decimal, tal y como lo devuelve el backend (`"1510330.00"`), hecho legible.
 *
 * Sin esto la cartera enseñaba «1510330.00» en la tarjeta de exposición y en cada fila de la
 * tabla: siete dígitos seguidos que hay que contar con el dedo para saber si son cien mil o un
 * millón. No se le pone símbolo de moneda porque la API no declara ninguna; lo que faltaba era la
 * separación de miles, no la divisa.
 */
export function formatAmount(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function safeText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

export function objectEntries(
  value: Record<string, unknown> | null | undefined,
): Array<[string, unknown]> {
  if (!value) return [];
  return Object.entries(value);
}
