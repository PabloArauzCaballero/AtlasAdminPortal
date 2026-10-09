/**
 * Qué almacenes puede alcanzar el reenvío de subidas (`route.ts`). Falla CERRADO.
 *
 * La lista sale de `ALMACEN_HOSTS_PERMITIDOS` (separada por comas, se lee en cada petición) y es
 * EXACTA: cada entrada es `host` (sólo con el puerto implícito del esquema) o `host:puerto`. No hay
 * patrones: un prefijo como `minio.` dejaba pasar `minio.10.0.0.5.sslip.io` o
 * `minio.169.254.169.254.nip.io`, que resuelven a cualquier IP (ADM-01, auditoría 2026-10-09).
 *
 * Sin lista, en producción no se reenvía nada (503: almacén no configurado). Fuera de producción
 * —`next dev` en el equipo— se admiten `localhost` y `127.0.0.1` en cualquier puerto, que es donde
 * corre el MinIO local.
 */
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1"]);

const PUERTO_IMPLICITO: Record<string, string> = {
  "http:": "80",
  "https:": "443",
};

export type VeredictoDestino = "permitido" | "no-permitido" | "sin-configurar";

function listaPermitida(): string[] {
  return (process.env.ALMACEN_HOSTS_PERMITIDOS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function veredictoDestino(destino: URL): VeredictoDestino {
  const lista = listaPermitida();
  const nombre = destino.hostname.toLowerCase();
  if (lista.length === 0) {
    if (process.env.NODE_ENV === "production") return "sin-configurar";
    return HOSTS_LOCALES.has(nombre) ? "permitido" : "no-permitido";
  }
  // `URL` deja `port` vacío cuando es el implícito del esquema: `host` es entonces sólo el nombre.
  const candidatos = new Set([destino.host.toLowerCase()]);
  if (destino.port === "") {
    candidatos.add(`${nombre}:${PUERTO_IMPLICITO[destino.protocol] ?? ""}`);
  }
  return lista.some((entrada) => candidatos.has(entrada))
    ? "permitido"
    : "no-permitido";
}
