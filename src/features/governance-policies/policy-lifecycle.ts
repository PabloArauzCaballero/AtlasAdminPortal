/**
 * El ciclo de vida de una política, en un solo sitio.
 *
 * **Qué arregla.** La lista pintaba el estado como un booleano: activa o
 * inactiva. Con eso, «todavía no se ha aprobado», «se suspendió por una
 * incidencia», «venció el mes pasado» y «se archivó al reemplazarla» se ven
 * exactamente igual — y son cuatro situaciones que exigen cuatro acciones
 * distintas de cuatro personas distintas. Un borrador se termina de escribir;
 * una suspendida se investiga; una vencida se renueva o se retira; una archivada
 * no se toca.
 *
 * **Y el defecto que se llevaba por delante:** una política marcada como activa
 * cuya vigencia ya pasó seguía enseñándose como activa. El estado guardado dice
 * lo que alguien declaró; la vigencia dice lo que hoy es cierto. Cuando los dos
 * discrepan, manda el calendario — porque una política vencida que se lee como
 * vigente es alguien aplicando una regla que ya no rige.
 */

export const ESTADOS_DE_POLITICA = {
  BORRADOR: {
    code: "BORRADOR",
    label: "Borrador",
    tone: "muted" as const,
    /** Si la política rige AHORA. Es lo único que decide si se aplica. */
    vigente: false,
    help: "Se está redactando. Todavía no rige y no puede aplicarse.",
  },
  ACTIVA: {
    code: "ACTIVA",
    label: "Activa",
    tone: "success" as const,
    vigente: true,
    help: "Rige ahora mismo. Toda operación en su alcance queda sujeta a ella.",
  },
  SUSPENDIDA: {
    code: "SUSPENDIDA",
    label: "Suspendida",
    tone: "warning" as const,
    vigente: false,
    help: "Aprobada pero detenida a propósito. No se aplica hasta reactivarla.",
  },
  VENCIDA: {
    code: "VENCIDA",
    label: "Vencida",
    tone: "warning" as const,
    vigente: false,
    help: "Su fecha de vigencia ya pasó. Hay que renovarla o retirarla formalmente.",
  },
  ARCHIVADA: {
    code: "ARCHIVADA",
    label: "Archivada",
    tone: "muted" as const,
    vigente: false,
    help: "Retirada. Se conserva porque las decisiones que tomó siguen citándola.",
  },
} as const;

export type EstadoDePolitica = keyof typeof ESTADOS_DE_POLITICA;

/** Los estados en el orden del ciclo de vida, para pintar un filtro. */
export const ESTADOS_EN_ORDEN = Object.values(ESTADOS_DE_POLITICA);

/**
 * Lo que el backend puede escribir en `status`, traducido.
 *
 * Se acepta más de una grafía por estado a propósito: la columna es texto libre
 * y a lo largo del tiempo han convivido `ACTIVE`, `active` y `ACTIVA`. Fallar
 * ante una grafía que no se esperaba dejaría la fila sin estado, que es peor que
 * traducir de más.
 */
const SINONIMOS: Record<string, EstadoDePolitica> = {
  DRAFT: "BORRADOR",
  BORRADOR: "BORRADOR",
  ACTIVE: "ACTIVA",
  ACTIVA: "ACTIVA",
  ENABLED: "ACTIVA",
  SUSPENDED: "SUSPENDIDA",
  SUSPENDIDA: "SUSPENDIDA",
  PAUSED: "SUSPENDIDA",
  EXPIRED: "VENCIDA",
  VENCIDA: "VENCIDA",
  ARCHIVED: "ARCHIVADA",
  ARCHIVADA: "ARCHIVADA",
  INACTIVE: "ARCHIVADA",
  DISABLED: "ARCHIVADA",
};

export interface EntradaDeEstado {
  /** Lo que el backend declara. `null` cuando sólo hay un booleano. */
  status?: string | null;
  /** Booleano heredado, para las políticas que aún no publican estado. */
  active?: boolean | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
}

/**
 * El estado EFECTIVO de una política hoy.
 *
 * El orden de las comprobaciones es la decisión. Archivada y suspendida ganan
 * sobre el calendario —son decisiones humanas explícitas, y una política
 * archivada no «vence», ya se retiró—; el calendario gana sobre «activa», que es
 * el caso que producía la lectura falsa.
 */
export function estadoEfectivo(
  entrada: EntradaDeEstado,
  ahora: Date = new Date(),
): EstadoDePolitica {
  const declarado = entrada.status
    ? SINONIMOS[entrada.status.trim().toUpperCase()]
    : undefined;

  // Sin estado declarado se cae al booleano heredado. `false` es ARCHIVADA y no
  // BORRADOR: una política que existió y se apagó no vuelve a estar sin escribir.
  const base: EstadoDePolitica =
    declarado ?? (entrada.active === false ? "ARCHIVADA" : "ACTIVA");

  if (base === "ARCHIVADA" || base === "SUSPENDIDA" || base === "BORRADOR") {
    return base;
  }

  const hasta = fecha(entrada.effectiveUntil);
  if (hasta !== null && hasta.getTime() < ahora.getTime()) return "VENCIDA";

  // Aprobada pero con vigencia futura: todavía no rige, y decir «activa» haría
  // creer que ya se aplica.
  const desde = fecha(entrada.effectiveFrom);
  if (desde !== null && desde.getTime() > ahora.getTime()) return "BORRADOR";

  return base;
}

function fecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const parsed = new Date(valor);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** La descripción del estado, para pintarla con su tono y su ayuda. */
export function describirEstado(estado: EstadoDePolitica) {
  return ESTADOS_DE_POLITICA[estado];
}

/** Si la política se está aplicando ahora mismo. */
export function estaVigente(entrada: EntradaDeEstado, ahora?: Date): boolean {
  return ESTADOS_DE_POLITICA[estadoEfectivo(entrada, ahora)].vigente;
}
