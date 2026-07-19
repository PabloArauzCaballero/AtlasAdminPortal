/**
 * Formatos para Bolivia (FASE 14, parte de formatos). Usa `Intl` nativo, sin
 * dependencias. La migración completa de textos con next-intl es aparte; esto
 * cubre montos en BOB, números, porcentajes, fechas y duraciones con la zona
 * horaria oficial.
 */

const LOCALE = "es-BO";
const TIME_ZONE = "America/La_Paz";

/** Número con separadores de es-BO. `fractionDigits` fija los decimales. */
export function formatNumberBO(value: number, fractionDigits?: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  }).format(value);
}

/**
 * Monto en bolivianos. El prefijo "Bs" se pone explícito para no depender del
 * símbolo que elija ICU según su versión; el número sí usa el formato es-BO.
 */
export function formatBOB(amount: number): string {
  return `Bs ${formatNumberBO(amount, 2)}`;
}

/** Porcentaje a partir de una razón (0.5 -> "50 %"). */
export function formatPercentBO(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** Fecha en zona horaria de Bolivia (dd/mm/aaaa). */
export function formatDateBO(input: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDate(input));
}

/** Fecha y hora (24h) en zona horaria de Bolivia. */
export function formatDateTimeBO(input: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(toDate(input));
}

/** Duración legible a partir de milisegundos ("1 min 30 s", "500 ms"). */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours) parts.push(`${hours} h`);
  if (minutes) parts.push(`${minutes} min`);
  if (seconds || parts.length === 0) parts.push(`${seconds} s`);
  return parts.join(" ");
}
