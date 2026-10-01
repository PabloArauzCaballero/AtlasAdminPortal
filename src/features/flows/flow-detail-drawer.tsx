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
import { useAuth } from "@/shared/auth/auth-context";
import { roleLabel } from "@/features/processes/labels";
import { useFlow } from "./hooks";
import type { FlowDetail } from "./types";
import {
  CLIENT_OPTIONS,
  FINDING_KIND_OPTIONS,
  labelFrom,
} from "./filter-options";
import {
  authorizationLabel,
  contractLabel,
  discoveryLabel,
  findingStatusLabel,
  freshnessLabel,
  kindLabel,
  testsLabel,
  verificationLabel,
} from "./flow-labels";

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
      title={flow.data?.name ?? "Operación"}
      onClose={onClose}
    >
      {flow.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {flow.error ? (
        <ErrorState
          description={
            isAtlasApiError(flow.error)
              ? flow.error.message
              : "No se pudo cargar la operación."
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
  const sinAnalizar = "Sin analizar todavía";
  return (
    <>
      <dl className="space-y-1">
        <Row label="Diagrama">
          <span className="flex flex-wrap gap-3 text-xs">
            <Link
              className="text-atlas-accent underline"
              href={`/internal/flows/graph?flow=${flow.id}`}
            >
              Ver el diagrama de esta operación
            </Link>
            <Link
              className="text-atlas-accent underline"
              href={`/internal/flows/graph?systemCode=${flow.systemCode}&module=${flow.module}`}
            >
              Ver el diagrama del módulo
            </Link>
          </span>
        </Row>
        <EndpointLink handler={flow.handler} />
        <Row label="Sistema · módulo">
          <BlockBadge value={flow.systemCode} /> {flow.module}
        </Row>
        <Row label="Riesgo">
          <RiskBadge value={flow.risk} />
        </Row>
        <Row label="Estado">
          {discoveryLabel(flow.discovery)} ·{" "}
          {verificationLabel(flow.verification)} ·{" "}
          {freshnessLabel(flow.freshness)}
        </Row>
        <Row label="Tipo">{kindLabel(flow.kind)}</Row>
        <Row label="Autorización">{authorizationLabel(flow)}</Row>
        <Row label="Roles">
          <Chips
            values={flow.roles.map((role) => roleLabel(role))}
            empty="Ninguno declarado"
          />
        </Row>
        <Row label="Quién la llama">
          <Chips
            values={flow.callers.map((caller) =>
              labelFrom(CLIENT_OPTIONS, caller),
            )}
            empty="Ninguna pantalla ni sistema la llama de forma reconocible"
          />
        </Row>
        <Row label="Verificación">
          {flow.verifiedAt ? (
            <span className="text-xs">
              {verificationLabel(flow.verification)} ·{" "}
              {flow.verificationEvidence.ok ?? 0} llamadas sin error del
              servidor, {flow.verificationEvidence.failed ?? 0} con error del
              servidor · última{" "}
              {formatDateTime(
                flow.verificationEvidence.lastAt ?? flow.verifiedAt,
              )}
            </span>
          ) : (
            <span className="text-atlas-muted">
              Nadie la llamó en la ventana medida: sin verificar no quiere decir
              rota
            </span>
          )}
        </Row>
        <Row label="Pruebas">{testsLabel(flow.testStatus)}</Row>
        <Row label="Contrato">{contractLabel(flow.contractStatus)}</Row>
        <Row label="Analizada">{formatDateTime(flow.updatedAt)}</Row>
        <Row label={`Hallazgos (${flow.findings.length})`}>
          {flow.findings.length ? (
            <ul className="space-y-2">
              {flow.findings.map((finding) => (
                <li key={finding.key} className="text-xs">
                  <SeverityBadge value={finding.severity} />{" "}
                  <strong>
                    {labelFrom(FINDING_KIND_OPTIONS, finding.kind)}
                  </strong>{" "}
                  · {finding.summary}
                  {finding.status !== "open"
                    ? ` (${findingStatusLabel(finding.status)})`
                    : ""}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-atlas-muted">Sin hallazgos abiertos</span>
          )}
        </Row>
      </dl>
      <details className="mt-3 rounded-lg border border-atlas-border p-3 text-sm">
        <summary className="cursor-pointer font-medium text-atlas-text">
          Referencia técnica
        </summary>
        <p className="mt-2 text-xs text-atlas-muted">
          Para quien tenga que tocar el código de esta operación.
        </p>
        <dl className="space-y-1">
          <Row label="Ruta">
            <span className="inline-flex items-center gap-2 font-mono text-xs">
              <MethodBadge method={flow.httpMethod} />
              {flow.path}
              <CopyButton value={`${flow.httpMethod} ${flow.path}`} />
            </span>
          </Row>
          <Row label="Permisos internos">
            <Chips values={flow.internalPermissions} empty="Ninguno" />
          </Row>
          <Row label="Identificador">
            <span className="font-mono text-xs">{flow.id}</span> ·{" "}
            <span className="font-mono text-xs">{flow.slug}</span>
          </Row>
          <Row label="Dónde está">
            <span className="font-mono text-xs">
              {flow.controller}.{flow.handler}
            </span>
            {flow.sourceFile ? (
              <span className="block font-mono text-xs">
                {flow.sourceFile}
                {flow.sourceLine ? `:${flow.sourceLine}` : ""}
              </span>
            ) : null}
          </Row>
          <Row label="Por qué ese riesgo">
            {flow.riskBasis} <Chips values={flow.badges} empty="" />
          </Row>
          <Row label="Tablas que escribe">
            <Chips
              values={flow.writes}
              empty={flow.analysis ? "Ninguna" : sinAnalizar}
            />
          </Row>
          <Row label="Tablas que lee">
            <Chips
              values={flow.reads}
              empty={flow.analysis ? "Ninguna" : sinAnalizar}
            />
          </Row>
          <Row label="Lógica que usa">
            <Chips
              values={flow.analysis?.services ?? []}
              empty={flow.analysis ? "Ninguna resuelta" : sinAnalizar}
            />
          </Row>
          <Row label="Errores que lanza">
            <Chips
              values={flow.analysis?.errors ?? []}
              empty={flow.analysis ? "Ninguno" : sinAnalizar}
            />
          </Row>
          <Row label="Todo o nada">
            {flow.analysis
              ? flow.analysis.transactional
                ? "Sí"
                : "No"
              : sinAnalizar}
          </Row>
          <Row label="Lo que falta">
            {flow.analysis?.unknowns.length ? (
              <ul className="space-y-1 text-xs">
                {flow.analysis.unknowns.map((gap) => (
                  <li key={`${gap.reason}-${gap.at}`}>
                    {gap.reason} · {gap.at}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-atlas-muted">
                {flow.analysis ? "Nada" : sinAnalizar}
              </span>
            )}
          </Row>
        </dl>
      </details>
    </>
  );
}

/**
 * Enlace cruzado a la ficha del catálogo de endpoints: los dos catálogos describen las mismas
 * rutas desde lados distintos. Se busca por el método del controlador, que los dos guardan igual, y
 * sólo se enseña a quien puede abrir Endpoints (`systems.endpoints.read`).
 */
function EndpointLink({ handler }: Readonly<{ handler: string }>) {
  const { hasPermission } = useAuth();
  if (!handler || !hasPermission("systems.endpoints.read")) return null;
  return (
    <Row label="Catálogo">
      <Link
        className="text-xs text-atlas-accent underline"
        href={`/internal/systems/endpoints?q=${encodeURIComponent(handler)}`}
      >
        Ver en el catálogo de operaciones
      </Link>
    </Row>
  );
}
