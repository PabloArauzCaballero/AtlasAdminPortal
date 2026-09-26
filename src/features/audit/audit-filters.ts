import type {
  ActionLogFilterCatalog,
  ActionLogFilterField,
} from "@/features/systems/types";

/**
 * El estado de los filtros de la auditoría, aparte de quien los pinta.
 *
 * Se separa por dos razones. La primera es que aquí vive la única regla que de
 * verdad puede romper la pantalla —cuándo se vuelve a la página 1— y quería
 * poder probarla sin montar un navegador. La segunda es que los filtros ya no
 * son tres constantes: son los que el backend publique, y esa lista puede
 * crecer sin que nadie toque este archivo.
 */

/** Valores activos, indexados por el nombre del parámetro del endpoint. */
export type AuditFilterState = Readonly<Record<string, string>>;

/** Los filtros que se pintan siempre, aunque el catálogo no haya llegado. */
export const CAMPOS_MINIMOS: ActionLogFilterField[] = [
  {
    name: "requestId",
    label: "Request ID",
    source: "SCHEMA",
    control: "text",
    options: [],
  },
];

/**
 * Tamaños de página ofrecidos.
 *
 * El techo es 100 porque es lo que el esquema del endpoint acepta; ofrecer 250
 * pintaría una opción que responde 400. Que el máximo de la interfaz salga del
 * máximo del backend es justo lo que evita ese tipo de promesa rota.
 */
export const TAMANOS_DE_PAGINA = [10, 25, 50, 100] as const;
export const TAMANO_POR_DEFECTO = 25;

/**
 * Los campos a pintar: los del catálogo, o el mínimo mientras carga.
 *
 * Nunca devuelve una lista vacía a propósito. Una barra de filtros que
 * desaparece mientras carga hace saltar la tabla al llegar, y quien estaba
 * escribiendo pierde el foco a mitad de palabra.
 */
export function camposDeFiltro(
  catalogo: ActionLogFilterCatalog | undefined,
): ActionLogFilterField[] {
  const campos = catalogo?.fields ?? [];
  return campos.length > 0 ? campos : CAMPOS_MINIMOS;
}

/**
 * Aplica un cambio de filtro.
 *
 * Un valor vacío BORRA la clave en vez de mandarla vacía: `?module=` es un
 * filtro por cadena vacía y el backend, con razón, no devuelve nada. Ése era el
 * camino corto a «limpié el filtro y la tabla se quedó en blanco».
 */
export function aplicarFiltro(
  estado: AuditFilterState,
  nombre: string,
  valor: string,
): AuditFilterState {
  const siguiente: Record<string, string> = { ...estado };
  if (valor.trim() === "") delete siguiente[nombre];
  else siguiente[nombre] = valor;
  return siguiente;
}

/** Cuántos filtros hay puestos. Es lo que decide si ofrecer «Limpiar». */
export function filtrosActivos(estado: AuditFilterState): number {
  return Object.keys(estado).length;
}

/**
 * La consulta que se manda al endpoint.
 *
 * **Las fechas se normalizan a ISO completo.** El control de fecha del
 * navegador entrega `2026-08-16`, y el esquema del backend exige `datetime()`:
 * mandarlo tal cual devolvía un 400 que en la pantalla se leía como «la
 * auditoría está caída». `from` se ancla al principio del día y `to` al final,
 * que además es lo que cualquiera espera de un rango de fechas — con las dos
 * ancladas al inicio, elegir el mismo día en ambas no devolvía nada.
 */
export function consultaDeAuditoria(
  estado: AuditFilterState,
  page: number,
  limit: number,
): Record<string, string | number> {
  const query: Record<string, string | number> = { page, limit };
  for (const [nombre, valor] of Object.entries(estado)) {
    if (nombre === "from") query.from = comoInstante(valor, "inicio");
    else if (nombre === "to") query.to = comoInstante(valor, "fin");
    else query[nombre] = valor;
  }
  return query;
}

function comoInstante(valor: string, extremo: "inicio" | "fin"): string {
  // Ya viene con hora: se respeta tal cual.
  if (valor.includes("T")) return new Date(valor).toISOString();
  const sufijo = extremo === "inicio" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  return `${valor}${sufijo}`;
}
