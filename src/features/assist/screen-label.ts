import { breadcrumbLabels } from "@/shared/components/layout/internal-shell/breadcrumb-labels";
import {
  navGroups,
  navItems,
} from "@/shared/components/layout/internal-shell/nav-config";
import { CASE_QUEUE_NAV_ITEMS } from "@/shared/components/layout/internal-shell/nav-items-case-queues";
import { supportNavItems } from "@/shared/components/layout/internal-shell/nav-items-support";

/**
 * «Dónde está la persona», dicho con el nombre que ve en el menú: `Operaciones › Cola de trabajo`.
 *
 * El asistente lo usa sólo para entender «aquí» o «esta pantalla». Se arma con la MISMA navegación
 * que pinta la barra lateral, así que si un ítem se renombra, el asistente se entera sin tocar esto.
 * Nunca lleva ids ni datos: de la ruta sólo se toman los segmentos que tienen nombre visible.
 */

type Entrada = { href: string; label: string };

const OPERACIONES = "Operaciones";

/**
 * Pantallas que existen y no tienen ítem propio en el menú: se llega a ellas desde otra (la ficha
 * del cliente, la cola de trabajo, la bandeja de soporte). Sin esto caerían en la sección padre.
 */
const SIN_ITEM_EN_MENU: readonly Entrada[] = [
  { href: "/internal/search", label: "Búsqueda" },
  {
    href: "/internal/operations/customers",
    label: `${OPERACIONES} › Clientes`,
  },
  {
    href: "/internal/operations/sessions",
    label: `${OPERACIONES} › Sesiones`,
  },
  {
    href: "/internal/operations/risk-assessments",
    label: `${OPERACIONES} › Evaluaciones de riesgo`,
  },
  {
    href: "/internal/operations/credit/applications",
    label: "Crédito › Solicitudes",
  },
];

function entradas(): Entrada[] {
  const sueltos = navItems.map((item) => ({
    href: item.href,
    label: item.label,
  }));
  const agrupados = navGroups.flatMap((grupo) =>
    grupo.items.map((item) => ({
      href: item.href,
      label:
        grupo.label === item.label
          ? item.label
          : `${grupo.label} › ${item.label}`,
    })),
  );
  const operaciones = [...CASE_QUEUE_NAV_ITEMS, ...supportNavItems].map(
    (item) => ({ href: item.href, label: `${OPERACIONES} › ${item.label}` }),
  );
  return [...sueltos, ...agrupados, ...operaciones, ...SIN_ITEM_EN_MENU];
}

const ENTRADAS = entradas();

/** Lo único que acepta el servidor: letras, números, espacios y `›/·_-().,`. */
function limpiar(texto: string): string {
  return texto
    .replace(/[^\p{L}\p{N} ›/·_\-().,]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
}

function coincide(pathname: string, href: string): boolean {
  // La portada es prefijo de todo: sólo vale para sí misma.
  if (href === "/internal") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** El nombre visible de un segmento de ruta, si lo tiene; los ids no lo tienen. */
function nombreDeSegmento(segmento: string): string | null {
  return Object.hasOwn(breadcrumbLabels, segmento)
    ? breadcrumbLabels[segmento]
    : null;
}

export function assistScreenFor(pathname: string | null | undefined): string {
  const ruta = (pathname ?? "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const mejor = ENTRADAS.filter((entrada) => coincide(ruta, entrada.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  if (mejor) {
    // Un nivel más de detalle si la ruta sigue y su último tramo con nombre dice algo nuevo:
    // `Crédito › Solicitudes › Desde la cola`, `Operaciones › Soporte › Casos`.
    const resto = ruta.slice(mejor.href.length).split("/").filter(Boolean);
    const detalle = resto
      .map(nombreDeSegmento)
      .filter((nombre): nombre is string => Boolean(nombre))
      .at(-1);
    const base = limpiar(mejor.label);
    if (detalle && !base.endsWith(detalle))
      return limpiar(`${base} › ${detalle}`);
    return base;
  }

  const partes = ruta
    .split("/")
    .filter((segmento) => segmento && segmento !== "internal")
    .map(nombreDeSegmento)
    .filter((nombre): nombre is string => Boolean(nombre))
    .slice(0, 3);
  return limpiar(partes.join(" › ")) || "Inicio";
}
