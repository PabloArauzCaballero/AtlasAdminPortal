"use client";

import { useMemo, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { cn } from "@/shared/lib/cn";
import {
  QA_SCENARIOS,
  type QaScenarioDefinition,
  type QaScenarioKey,
} from "../qa-scenarios";

/** Tono de cada escenario: el mismo color significa lo mismo en el lab y en la guía. */
export const SCENARIO_TONE: Record<
  QaScenarioKey,
  "success" | "warning" | "critical" | "info"
> = {
  valid_payload: "success",
  without_auth: "warning",
  invalid_token: "warning",
  wrong_role_token: "critical",
  missing_tenant: "warning",
  missing_idempotency_key: "info",
  invalid_payload: "warning",
  custom: "info",
};

const AUTH_LABEL: Record<string, string> = {
  session: "sesión",
  none: "ninguno",
  invalid: "token inválido",
  custom: "token manual",
};

function HeaderState({
  state,
  label,
}: Readonly<{ state: "on" | "off" | "manual"; label: string }>) {
  return (
    <span
      className={cn(
        "rounded-md border bg-white px-2.5 py-1 font-mono text-[0.6875rem]",
        state === "on" && "border-emerald-200 text-emerald-700",
        state === "off" && "border-red-200 text-red-700 line-through",
        state === "manual" && "border-amber-200 text-amber-700",
      )}
    >
      {label}
    </span>
  );
}

function headerCell(
  scenario: QaScenarioDefinition,
  pick: (patch: NonNullable<QaScenarioDefinition["patch"]>) => ReactNode,
) {
  return scenario.patch ? (
    pick(scenario.patch)
  ) : (
    <HeaderState state="manual" label="a mano" />
  );
}

const SCENARIO_COLUMNS: ColumnDef<QaScenarioDefinition>[] = [
  {
    id: "scenario",
    header: "Escenario",
    accessorFn: (scenario) => scenario.label,
    cell: ({ row }) => (
      <Badge tone={SCENARIO_TONE[row.original.key] ?? "default"}>
        {row.original.label}
      </Badge>
    ),
  },
  {
    id: "what",
    header: "Qué cambia",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="block max-w-sm text-xs text-atlas-muted">
        {row.original.description}
      </span>
    ),
  },
  {
    id: "auth",
    header: "Credencial",
    enableSorting: false,
    cell: ({ row }) =>
      headerCell(row.original, (patch) => (
        <HeaderState
          state={patch.authMode === "session" ? "on" : "off"}
          label={AUTH_LABEL[patch.authMode] ?? patch.authMode}
        />
      )),
  },
  {
    id: "tenant",
    header: "Empresa (sale de tu sesión)",
    enableSorting: false,
    cell: ({ row }) =>
      headerCell(row.original, (patch) => (
        <HeaderState
          state={patch.includeTenantHeader ? "on" : "off"}
          label={patch.includeTenantHeader ? "incluido" : "omitido"}
        />
      )),
  },
  {
    id: "idempotency",
    header: "Protección contra duplicados",
    enableSorting: false,
    cell: ({ row }) =>
      headerCell(row.original, (patch) => (
        <HeaderState
          state={patch.includeIdempotencyKey ? "on" : "off"}
          label={patch.includeIdempotencyKey ? "incluido" : "omitido"}
        />
      )),
  },
  {
    id: "expected",
    header: "Resultado esperado",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="block max-w-sm text-xs font-medium text-atlas-text">
        {row.original.expectedOutcome}
      </span>
    ),
  },
];

/**
 * Los ocho escenarios del lab con lo que cada uno cambia en las cabeceras y lo que se espera. Es
 * un catálogo fijo del propio portal: entra entero, sin buscador ni paginación.
 */
export function ScenarioTable() {
  return <DataTable data={QA_SCENARIOS} columns={SCENARIO_COLUMNS} />;
}

type TargetRow = {
  id: string;
  badge: ReactNode;
  permits: ReactNode;
  url: string;
};

const EJECUTAR = <strong>EJECUTAR</strong>;

const TARGETS: TargetRow[] = [
  {
    id: "portal",
    badge: <Badge tone="success">Este mismo portal</Badge>,
    permits: (
      <>
        La API del propio portal (lo correcto en un portal desplegado). Un
        cambio real exige teclear {EJECUTAR}.
      </>
    ),
    url: "La dirección de la API del portal",
  },
  {
    id: "local",
    badge: <Badge tone="success">Local</Badge>,
    permits:
      "Tu máquina: todo, incluido un cambio real sin fricción extra. Sólo sirve si abriste el portal en tu ordenador.",
    url: "Tu ordenador (puerto 3005)",
  },
  {
    id: "staging",
    badge: <Badge tone="info">Preproducción</Badge>,
    permits: (
      <>
        Funcional y carga reales; un cambio de datos exige teclear {EJECUTAR}.
      </>
    ),
    url: "La dirección de preproducción configurada",
  },
  {
    id: "prod",
    badge: <Badge tone="critical">Producción (sólo lectura)</Badge>,
    permits: (
      <>
        Sólo simulación. Toda ejecución real y toda prueba de carga quedan{" "}
        <strong>bloqueados</strong>.
      </>
    ),
    url: "La dirección de producción configurada",
  },
];

/** Los ambientes contra los que se puede disparar y qué permite cada uno. */
export function TargetsTable() {
  const columns = useMemo<ColumnDef<TargetRow>[]>(
    () => [
      {
        id: "target",
        header: "Ambiente",
        enableSorting: false,
        cell: ({ row }) => row.original.badge,
      },
      {
        id: "permits",
        header: "Qué permite",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-lg text-atlas-text">
            {row.original.permits}
          </span>
        ),
      },
      {
        id: "url",
        header: "Dirección",
        accessorFn: (row) => row.url,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-atlas-muted">
            {row.original.url}
          </span>
        ),
      },
    ],
    [],
  );
  return <DataTable data={TARGETS} columns={columns} />;
}

type DialRow = { name: string; controls: string; range: string };

const DIALS: DialRow[] = [
  {
    name: "Peticiones por segundo",
    controls: "Ritmo que se intenta sostener.",
    range: "1 – 500",
  },
  {
    name: "Peticiones a la vez",
    controls: "Peticiones esperando respuesta al mismo tiempo.",
    range: "1 – 200",
  },
  {
    name: "Duración",
    controls: "Tiempo total planeado de la corrida.",
    range: "1 – 3600 s",
  },
  {
    name: "Subida gradual",
    controls: "Sube el ritmo poco a poco en vez de arrancar a tope.",
    range: "0 – duración",
  },
  {
    name: "Tope de peticiones",
    controls:
      "Techo duro. Si peticiones por segundo × duración lo supera, la corrida se recorta aquí.",
    range: "1 – 10.000",
  },
];

const DIAL_COLUMNS: ColumnDef<DialRow>[] = [
  {
    id: "dial",
    header: "Dial",
    accessorFn: (row) => row.name,
    cell: ({ row }) => (
      <code className="font-mono text-atlas-accent">{row.original.name}</code>
    ),
  },
  {
    id: "controls",
    header: "Qué controla",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="block max-w-lg">{row.original.controls}</span>
    ),
  },
  {
    id: "range",
    header: "Rango",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-muted">
        {row.original.range}
      </span>
    ),
  },
];

/** Los diales de la prueba de carga y su rango. */
export function DialsTable() {
  return <DataTable data={DIALS} columns={DIAL_COLUMNS} />;
}
