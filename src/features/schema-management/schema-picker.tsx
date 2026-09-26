"use client";

import {
  Boxes,
  CreditCard,
  Database,
  Fingerprint,
  Gauge,
  Plug,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SchemaNameSummary } from "./types";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";

/**
 * Los esquemas de datos de una versión, como rejilla de tarjetas.
 *
 * El icono no decora: es el atajo por el que se reconoce un esquema sin leer su nombre, y sale de
 * lo que ese esquema GUARDA. `iam` lleva huella dactilar porque guarda identidades; `credit`, una
 * tarjeta; `audit`, un pergamino. Los que no están en el mapa caen en el icono genérico de base de
 * datos en vez de en uno cualquiera, que sería peor que ninguno: sugeriría un contenido que no es.
 */
const SCHEMA_ICONS: Record<string, LucideIcon> = {
  audit: ScrollText,
  case_management: Workflow,
  catalog: Boxes,
  credit: CreditCard,
  customer: Users,
  iam: Fingerprint,
  integrations: Plug,
  messaging: ShieldCheck,
  platform_ops: Gauge,
  privacy: ShieldAlert,
  read_api: Database,
  risk: ShieldAlert,
  telemetry: Gauge,
  public: Wallet,
};

const SCHEMA_LABELS: Record<string, string> = {
  audit: "Auditoría",
  case_management: "Gestión de casos",
  catalog: "Catálogos",
  credit: "Crédito",
  customer: "Clientes",
  iam: "Identidad y accesos",
  integrations: "Integraciones",
  messaging: "Mensajería",
  platform_ops: "Operación de plataforma",
  privacy: "Privacidad",
  read_api: "Vistas de lectura",
  risk: "Riesgo y fraude",
  telemetry: "Telemetría",
  public: "Infraestructura",
};

export function SchemaPicker({
  schemas,
  selected,
  onSelect,
}: Readonly<{
  schemas: SchemaNameSummary[];
  selected: string | null;
  onSelect: (schemaName: string | null) => void;
}>) {
  const totalTables = schemas.reduce((sum, item) => sum + item.tablesCount, 0);

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <SchemaCard
        icon={Database}
        title="Todos"
        subtitle={`los ${schemas.length} esquemas`}
        tables={totalTables}
        columns={schemas.reduce((sum, item) => sum + item.columnsCount, 0)}
        active={selected === null}
        onClick={() => onSelect(null)}
      />
      {schemas.map((schema) => (
        <SchemaCard
          key={schema.schemaName}
          icon={SCHEMA_ICONS[schema.schemaName] ?? Database}
          title={SCHEMA_LABELS[schema.schemaName] ?? schema.schemaName}
          subtitle={schema.schemaName}
          tables={schema.tablesCount}
          columns={schema.columnsCount}
          active={selected === schema.schemaName}
          onClick={() => onSelect(schema.schemaName)}
        />
      ))}
    </div>
  );
}

function SchemaCard({
  icon: Icon,
  title,
  subtitle,
  tables,
  columns,
  active,
  onClick,
}: Readonly<{
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tables: number;
  columns: number;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200",
        active
          ? "border-atlas-accent/50 bg-atlas-accentSoft shadow-glow"
          : "border-atlas-border bg-white shadow-card hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-gradient-to-br from-atlas-accent to-atlas-primary text-white"
            : "bg-atlas-soft text-atlas-muted group-hover:bg-slate-200",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-atlas-text">
          {title}
        </span>
        <span className="block truncate font-mono text-[11px] text-atlas-muted">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-base font-bold tabular-nums text-atlas-text">
          {formatNumber(tables)}
        </span>
        <span className="block text-[10px] uppercase tracking-wide text-atlas-muted">
          tablas
        </span>
        <span className="block text-[10px] tabular-nums text-atlas-muted">
          {formatNumber(columns)} col.
        </span>
      </span>
    </button>
  );
}
