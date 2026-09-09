"use client";

import Link from "next/link";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import {
  Badge,
  BlockBadge,
  MethodBadge,
  RiskBadge,
  SeverityBadge,
} from "@/shared/components/ui/badges";
import { CopyButton } from "@/shared/components/ui/copy-button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { useFlow } from "./hooks";
import type { FlowDetail } from "./types";

/**
 * Ficha de un flujo. Abrirla NUNCA ejecuta el endpoint que describe: sólo
 * lee el catálogo. Ejecutar se hace desde las suites de QA, a propósito.
 */
export function FlowDetailDrawer({
  flowId,
  onClose,
}: Readonly<{ flowId: string | null; onClose: () => void }>) {
  const flow = useFlow(flowId);
  return (
    <DrawerPanel
      open={Boolean(flowId)}
      title={flow.data?.name ?? "Flujo"}
      onClose={onClose}
    >
      {flow.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {flow.error ? (
        <ErrorState
          description={
            isAtlasApiError(flow.error)
              ? flow.error.message
              : "No se pudo cargar el flujo."
          }
          requestId={
            isAtlasApiError(flow.error) ? flow.error.requestId : undefined
          }
          onRetry={() => void flow.refetch()}
        />
      ) : null}
      {flow.data ? <FlowDetailBody flow={flow.data} /> : null}
    </DrawerPanel>
  );
}

function Row({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-atlas-line py-2 text-sm">
      <dt className="text-atlas-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Chips({
  values,
  empty,
}: Readonly<{ values: string[]; empty: string }>) {
  if (!values.length) return <span className="text-atlas-muted">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Badge key={value} tone="muted">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function FlowDetailBody({ flow }: Readonly<{ flow: FlowDetail }>) {
  const authLayer = flow.isPublic
    ? "Pública (@Public)"
    : flow.internalPermissions.length
      ? "Permiso interno (@InternalPermissions)"
      : flow.roles.length
        ? "Rol del token (@Roles)"
        : flow.guards.length
          ? `Guard propio (${flow.guards.join(", ")})`
          : "Sólo el guard global de JWT";
  return (
    <dl className="space-y-1">
      <Row label="Ruta">
        <span className="inline-flex items-center gap-2 font-mono text-xs">
          <MethodBadge method={flow.httpMethod} />
          {flow.path}
          <CopyButton value={`${flow.httpMethod} ${flow.path}`} />
        </span>
      </Row>
      <Row label="Grafo">
        <span className="flex flex-wrap gap-3 text-xs">
          <Link
            className="text-atlas-accent underline"
            href={`/internal/flows/graph?flow=${flow.id}`}
          >
            Ver grafo del flujo
          </Link>
          <Link
            className="text-atlas-accent underline"
            href={`/internal/flows/graph?systemCode=${flow.systemCode}&module=${flow.module}`}
          >
            Ver grafo del módulo
          </Link>
        </span>
      </Row>
      <Row label="Identidad">
        <span className="font-mono text-xs">{flow.id}</span> ·{" "}
        <span className="font-mono text-xs">{flow.slug}</span>
      </Row>
      <Row label="Bloque · módulo">
        <BlockBadge value={flow.systemCode} /> {flow.module}
      </Row>
      <Row label="Riesgo">
        <RiskBadge value={flow.risk} />{" "}
        <span className="text-xs text-atlas-muted">({flow.riskBasis})</span>{" "}
        <Chips values={flow.badges} empty="" />
      </Row>
      <Row label="Estado">
        <Chips
          values={[flow.discovery, flow.verification, flow.freshness]}
          empty=""
        />
      </Row>
      <Row label="Tipo">{flow.kind}</Row>
      <Row label="Autorización">{authLayer}</Row>
      <Row label="Roles">
        <Chips values={flow.roles} empty="Ninguno declarado" />
      </Row>
      <Row label="Permisos internos">
        <Chips values={flow.internalPermissions} empty="Ninguno" />
      </Row>
      <Row label="Quién la llama">
        <Chips
          values={flow.callers}
          empty="Ningún cliente ni bloque por literal"
        />
      </Row>
      <Row label="Controller">
        <span className="font-mono text-xs">
          {flow.controller}.{flow.handler}
        </span>
      </Row>
      <Row label="Fuente">
        {flow.sourceFile ? (
          <span className="font-mono text-xs">
            {flow.sourceFile}
            {flow.sourceLine ? `:${flow.sourceLine}` : ""}
          </span>
        ) : (
          <span className="text-atlas-muted">No expuesta en este entorno</span>
        )}
      </Row>
      <Row label="Tests">{flow.testStatus}</Row>
      <Row label="Contrato">{flow.contractStatus}</Row>
      <Row label="Analizado">
        {flow.analyzedBranch ?? "—"} @{" "}
        <span className="font-mono text-xs">
          {flow.analyzedCommit?.slice(0, 7) ?? "—"}
        </span>{" "}
        · {formatDateTime(flow.updatedAt)}
      </Row>
      <Row label={`Hallazgos (${flow.findings.length})`}>
        {flow.findings.length ? (
          <ul className="space-y-2">
            {flow.findings.map((finding) => (
              <li key={finding.key} className="text-xs">
                <SeverityBadge value={finding.severity} />{" "}
                <span className="font-mono">{finding.kind}</span> ·{" "}
                {finding.summary}
                {finding.status !== "open" ? ` (${finding.status})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-atlas-muted">Sin hallazgos abiertos</span>
        )}
      </Row>
    </dl>
  );
}
