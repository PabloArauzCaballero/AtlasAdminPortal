"use client";

import Link from "next/link";
import type { NetworkBlockHealth } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, safeText } from "@/shared/lib/format";

/**
 * Un bloque del ecosistema, con las dos verdades que hay que leer juntas.
 *
 * El estado vivo («¿responde?») y el estado del catálogo («¿está aportando lo suyo?») se presentan
 * en la misma tarjeta porque se contradicen a menudo, y esa contradicción es justamente el
 * diagnóstico útil: un bloque verde que lleva días sin federar significa que el problema es de
 * credencial o de contrato, no de disponibilidad.
 */
const liveTone: Record<string, "success" | "critical" | "warning" | "muted"> = {
  UP: "success",
  DOWN: "critical",
  DEGRADED: "warning",
  NOT_CONFIGURED: "muted",
};

const liveLabel: Record<string, string> = {
  UP: "En pie",
  DOWN: "Caído",
  DEGRADED: "Degradado",
  NOT_CONFIGURED: "Sin configurar",
};

const federationTone: Record<
  string,
  "success" | "critical" | "warning" | "muted" | "info"
> = {
  OK: "success",
  SELF_INTROSPECTED: "info",
  NEVER_RUN: "muted",
  NOT_CONFIGURED: "muted",
  UNREACHABLE: "critical",
  UNAUTHORIZED: "critical",
  INVALID_MANIFEST: "warning",
  ERROR: "critical",
};

const federationLabel: Record<string, string> = {
  OK: "Catálogo federado",
  SELF_INTROSPECTED: "Se introspecciona solo",
  NEVER_RUN: "Nunca federado",
  NOT_CONFIGURED: "Sin configurar",
  UNREACHABLE: "No contestó",
  UNAUTHORIZED: "Credencial rechazada",
  INVALID_MANIFEST: "Manifiesto no reconocido",
  ERROR: "Error",
};

export function NetworkBlockCard({
  block,
}: Readonly<{ block: NetworkBlockHealth }>) {
  const federationStatus = block.catalog.federationStatus;
  return (
    <Card
      className={cn(
        "animate-fade-in transition-shadow hover:shadow-md",
        block.liveState === "DOWN" && "border-red-300 ring-1 ring-red-200",
      )}
      testId={`network-block-${block.systemCode}`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{block.name}</p>
            <p className="truncate font-mono text-xs text-atlas-muted">
              {block.systemCode} · {block.repository}
            </p>
          </div>
          <Badge tone={liveTone[block.liveState] ?? "muted"} dot>
            {liveLabel[block.liveState] ?? block.liveState}
          </Badge>
        </div>

        <p className="text-xs text-atlas-muted">{safeText(block.purpose)}</p>

        <div className="grid grid-cols-2 gap-2">
          <CatalogCount
            label="Endpoints"
            value={block.catalog.endpoints}
            href={`/internal/systems/endpoints?block=${block.systemCode}`}
          />
          <CatalogCount
            label="Tablas"
            value={block.catalog.dataEntities}
            href={`/internal/data-catalog/tables?block=${block.systemCode}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={federationTone[federationStatus] ?? "muted"}>
            {federationLabel[federationStatus] ?? federationStatus}
          </Badge>
          {block.catalog.lastSuccessAt ? (
            <span className="text-xs text-atlas-muted">
              Última: {formatDateTime(block.catalog.lastSuccessAt)}
            </span>
          ) : null}
          {block.catalog.remoteVersion ? (
            <span className="font-mono text-[11px] text-atlas-muted">
              v{block.catalog.remoteVersion}
            </span>
          ) : null}
        </div>

        <p
          className={cn(
            "text-xs",
            block.liveState === "DOWN" ? "text-red-700" : "text-atlas-muted",
          )}
        >
          {safeText(block.healthMessage)}
        </p>

        {block.catalog.federationMessage ? (
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold text-atlas-muted">
              Última federación
            </p>
            <p className="mt-1 break-words text-xs">
              {safeText(block.catalog.federationMessage)}
            </p>
          </div>
        ) : null}

        <p className="text-xs italic text-atlas-muted">
          Si falta: {safeText(block.degradation)}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * El contador enlaza al catálogo ya filtrado por este bloque. Es el gesto que cierra el
 * diagnóstico: quien ve «0 tablas» quiere comprobarlo en la lista, no volver a filtrar a mano.
 */
function CatalogCount({
  label,
  value,
  href,
}: Readonly<{ label: string; value: number; href: string }>) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-atlas-border bg-atlas-soft p-2 transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <p className="text-xs text-atlas-muted">{label}</p>
      <p
        className={cn("text-lg font-semibold", value === 0 && "text-amber-600")}
      >
        {value}
      </p>
    </Link>
  );
}
