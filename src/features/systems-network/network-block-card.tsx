"use client";

import Link from "next/link";
import type { NetworkBlockHealth } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, safeText } from "@/shared/lib/format";
import {
  blockDisplayName,
  catalogCountText,
  catalogStatusCopy,
  isCatalogMeasured,
} from "./network-status-copy";

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

export function NetworkBlockCard({
  block,
}: Readonly<{ block: NetworkBlockHealth }>) {
  const status = catalogStatusCopy(block.kind, block.catalog.federationStatus);
  const measured = isCatalogMeasured(block);
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
          <p className="min-w-0 truncate text-sm font-semibold">
            {blockDisplayName(block)}
          </p>
          <Badge tone={liveTone[block.liveState] ?? "muted"} dot>
            {liveLabel[block.liveState] ?? "Desconocido"}
          </Badge>
        </div>

        <p className="text-xs text-atlas-muted">{safeText(block.purpose)}</p>

        <div className="grid grid-cols-2 gap-2">
          <CatalogCount
            label="Endpoints"
            value={block.catalog.endpoints}
            measured={measured}
            href={`/internal/systems/endpoints?block=${block.systemCode}`}
          />
          <CatalogCount
            label="Tablas"
            value={block.catalog.dataEntities}
            measured={measured}
            href={`/internal/data-catalog/tables?block=${block.systemCode}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {block.catalog.lastSuccessAt ? (
            <span className="text-xs text-atlas-muted">
              Leído: {formatDateTime(block.catalog.lastSuccessAt)}
            </span>
          ) : null}
          {block.catalog.remoteVersion ? (
            <span className="text-xs text-atlas-muted">
              Versión {block.catalog.remoteVersion}
            </span>
          ) : null}
        </div>

        <p className="text-xs">{status.explanation}</p>

        <p
          className={cn(
            "text-xs",
            block.liveState === "DOWN" ? "text-red-700" : "text-atlas-muted",
          )}
        >
          {safeText(block.healthMessage)}
        </p>

        {block.catalog.federationMessage ? (
          <details className="rounded-md bg-atlas-soft p-3 text-xs">
            <summary className="cursor-pointer font-semibold text-atlas-muted">
              Detalle técnico
            </summary>
            <p className="mt-1 break-words">
              {safeText(block.catalog.federationMessage)}
            </p>
          </details>
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
 *
 * Un cero que nadie midió se escribe «Sin medir»: pintarlo como 0 decía «este sistema no tiene
 * rutas» cuando lo cierto era «nadie las ha contado», y esas dos frases piden acciones opuestas.
 */
function CatalogCount({
  label,
  value,
  measured,
  href,
}: Readonly<{
  label: string;
  value: number;
  measured: boolean;
  href: string;
}>) {
  const text = catalogCountText(value, measured);
  return (
    <Link
      href={href}
      className="rounded-lg border border-atlas-border bg-atlas-soft p-2 transition-colors hover:border-atlas-accent/40 hover:bg-atlas-accentWash"
    >
      <p className="text-xs text-atlas-muted">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold",
          value === 0 && measured && "text-amber-600",
          !measured && value === 0 && "text-sm text-atlas-muted",
        )}
      >
        {text}
      </p>
    </Link>
  );
}
