import {
  Ban,
  Boxes,
  CircleCheck,
  CircleHelp,
  CreditCard,
  FlaskConical,
  Globe,
  HeartPulse,
  Landmark,
  Server,
  Share2,
  ShieldCheck,
  Signal,
  TestTubeDiagonal,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { humanizeKey } from "@/shared/lib/format";

/**
 * Insignias propias del módulo de proveedores externos.
 *
 * Están aquí y no en `shared/components/ui/badges` por el mismo motivo que las de credenciales
 * (`provider-badges` es hermano de `provider-auth-badges`): `StatusBadge` cae en gris para todo
 * literal que no conozca, y ni `UP`, ni `DOWN`, ni `DEGRADED` están en sus listas. El resultado
 * era un semáforo apagado: un proveedor CAÍDO se pintaba exactamente igual que uno sano, con el
 * mismo punto gris, y la única diferencia entre «todo va bien» y «esto no responde» eran cuatro
 * letras en inglés.
 *
 * Meterlos en las listas compartidas tampoco valía: `UP` y `DOWN` significan otra cosa en las
 * pantallas de despliegues y de trabajos programados. El mapeo vive acotado al módulo que sabe
 * qué quieren decir.
 */

type Descriptor = {
  label: string;
  tone: "success" | "warning" | "critical" | "muted" | "info";
  icon: LucideIcon;
};

const SALUD: Record<string, Descriptor> = {
  UP: { label: "Responde", tone: "success", icon: HeartPulse },
  HEALTHY: { label: "Responde", tone: "success", icon: HeartPulse },
  OK: { label: "Responde", tone: "success", icon: HeartPulse },
  DEGRADED: { label: "Degradado", tone: "warning", icon: TriangleAlert },
  DOWN: { label: "Caído", tone: "critical", icon: WifiOff },
  UNAVAILABLE: { label: "Caído", tone: "critical", icon: WifiOff },
  UNKNOWN: { label: "Sin medir", tone: "muted", icon: CircleHelp },
};

/**
 * Salud del proveedor, medida por el backend.
 *
 * `UNKNOWN` es gris a propósito y no verde: es lo que responde un proveedor deshabilitado, y
 * afirmar que está sano cuando nadie lo ha comprobado es peor que no decir nada.
 */
export function ProviderHealthBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  if (!value) return <Badge tone="muted">Sin datos</Badge>;
  const descriptor = SALUD[value.toUpperCase()];
  if (!descriptor) return <Badge tone="default">{value}</Badge>;
  return (
    <Badge tone={descriptor.tone} icon={descriptor.icon}>
      {descriptor.label}
    </Badge>
  );
}

const ESTADOS: Record<string, Descriptor> = {
  ACTIVE: { label: "Activo", tone: "success", icon: CircleCheck },
  DISABLED: { label: "Deshabilitado", tone: "critical", icon: Ban },
  MOCK_ONLY: { label: "Sólo simulado", tone: "muted", icon: FlaskConical },
  SANDBOX_ONLY: { label: "Sólo sandbox", tone: "warning", icon: Server },
};

/**
 * Estado del proveedor en el catálogo: si se le puede llamar y con qué alcance.
 *
 * Es distinto de la salud —esa la mide una sonda— y distinto del modo —ése dice de dónde sale el
 * dato—. `StatusBadge` sólo conocía `ACTIVE` y `DISABLED`; los dos estados «sólo ...» caían en
 * gris neutro con su literal en inglés.
 */
export function ProviderStatusBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  if (!value) return <Badge tone="muted">—</Badge>;
  const descriptor = ESTADOS[value.toUpperCase()];
  if (!descriptor) return <Badge tone="default">{value}</Badge>;
  return (
    <Badge tone={descriptor.tone} icon={descriptor.icon}>
      {descriptor.label}
    </Badge>
  );
}

const MODOS: Record<string, Descriptor> = {
  mock_local: { label: "Simulado local", tone: "muted", icon: FlaskConical },
  mock_server: {
    label: "Simulado servidor",
    tone: "info",
    icon: TestTubeDiagonal,
  },
  sandbox: { label: "Sandbox", tone: "warning", icon: Server },
  production: { label: "Producción", tone: "success", icon: Globe },
  disabled: { label: "Deshabilitado", tone: "critical", icon: Ban },
};

/**
 * Modo de ejecución del adaptador.
 *
 * El tono NO es un semáforo de salud: es cuánto se parece a la realidad lo que devuelve. Verde
 * es «production» porque es el único modo cuyo dato vale para decidir; el resto avisa, con más o
 * menos fuerza, de que lo que se ve viene de un simulador.
 */
export function ProviderModeBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  if (!value) return <Badge tone="muted">—</Badge>;
  const descriptor = MODOS[value.toLowerCase()];
  if (!descriptor) {
    return (
      <Badge tone="default" className="font-mono">
        {value}
      </Badge>
    );
  }
  return (
    <Badge tone={descriptor.tone} icon={descriptor.icon}>
      {descriptor.label}
    </Badge>
  );
}

const CATEGORIAS: Record<string, { label: string; icon: LucideIcon }> = {
  KYC: { label: "Identidad (KYC)", icon: ShieldCheck },
  IDENTITY: { label: "Identidad (KYC)", icon: ShieldCheck },
  CREDIT_BUREAU: { label: "Buró de crédito", icon: Landmark },
  BUREAU: { label: "Buró de crédito", icon: Landmark },
  TELCO: { label: "Telco", icon: Signal },
  PAYMENTS: { label: "Pagos", icon: CreditCard },
  SOCIAL: { label: "Redes sociales", icon: Share2 },
};

/**
 * Categoría del proveedor, con su icono.
 *
 * No es una insignia: en una tabla donde estado, modo, salud, credencial y token ya son cinco
 * pastillas de color, una sexta convierte la fila en un semáforo ilegible. El icono da la señal
 * de familia —identidad, buró, telco, pagos, redes— sin añadir otra caja coloreada.
 */
export function ProviderCategoryLabel({
  value,
}: Readonly<{ value?: string | null }>) {
  if (!value) return <span className="text-atlas-muted">—</span>;
  const descriptor = CATEGORIAS[value.toUpperCase()];
  const Icon = descriptor?.icon ?? Boxes;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className="h-4 w-4 shrink-0 text-atlas-muted" aria-hidden />
      {descriptor?.label ?? humanizeKey(value)}
    </span>
  );
}
