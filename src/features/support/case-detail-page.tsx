"use client";

import Link from "next/link";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Badge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { AccesoASoporte } from "./support-access-state";
import { CaseActions } from "./case-actions";
import { useSupportCase, useSupportCaseTimeline } from "./hooks";
import type { SupportCaseEvent } from "./types";
import { LifeBuoy } from "lucide-react";

export function SupportCaseDetailPage({
  caseId,
}: Readonly<{ caseId: string }>) {
  const caso = useSupportCase(caseId);
  const historia = useSupportCaseTimeline(caseId);

  return (
    <>
      <PageHeader
        icon={LifeBuoy}
        eyebrow="Soporte"
        title={caso.data ? caso.data.caseNumber : `Caso #${caseId}`}
        description={caso.data?.title}
        actions={
          <Link
            href="/internal/support"
            className="inline-flex items-center rounded-md border border-atlas-border px-3 py-1.5 text-xs text-atlas-text hover:bg-atlas-soft"
          >
            Volver a la bandeja
          </Link>
        }
      />

      {caso.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {caso.error ? (
        <AccesoASoporte
          error={caso.error}
          onRetry={() => void caso.refetch()}
        />
      ) : null}

      {caso.data ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="grid gap-3 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle sm:grid-cols-2 lg:grid-cols-3">
              <Dato label="Estado interno">
                <StatusBadge value={caso.data.internalStatus} />
              </Dato>
              <Dato label="Lo que ve el cliente">
                {safeText(caso.data.customerStatus)}
              </Dato>
              <Dato label="Prioridad">
                <SeverityBadge value={caso.data.priority} />
              </Dato>
              <Dato label="Sensibilidad">
                <Badge
                  tone={
                    caso.data.sensitivity === "RESTRICTED"
                      ? "critical"
                      : caso.data.sensitivity === "SENSITIVE"
                        ? "warning"
                        : "muted"
                  }
                >
                  {caso.data.sensitivity}
                </Badge>
              </Dato>
              <Dato label="Tipo">{safeText(caso.data.caseType)}</Dato>
              <Dato label="Dominio">{safeText(caso.data.domain)}</Dato>
              <Dato label="Abierto">{formatDateTime(caso.data.openedAt)}</Dato>
              <Dato label="Última actividad">
                {formatDateTime(caso.data.lastActivityAt)}
              </Dato>
              <Dato label="Agente">
                {caso.data.assigneeAgentId
                  ? `#${caso.data.assigneeAgentId}`
                  : "Sin asignar"}
              </Dato>
              <Dato label="Escalados">{caso.data.escalationLevel}</Dato>
              <Dato label="Transferencias">{caso.data.transferCount}</Dato>
              <Dato label="Retención legal">
                {caso.data.legalHold ? (
                  <Badge tone="critical">Sí — no se puede purgar</Badge>
                ) : (
                  "No"
                )}
              </Dato>
            </section>

            {caso.data.subjectCustomerId ? (
              <p className="text-xs text-atlas-muted">
                Sujeto del caso:{" "}
                <Link
                  href={`/internal/operations/customers/${caso.data.subjectCustomerId}/investigation-summary`}
                  className="font-mono text-atlas-accent underline"
                >
                  cliente #{caso.data.subjectCustomerId}
                </Link>
              </p>
            ) : null}

            {caso.data.internalSummary ? (
              <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
                  Resumen interno
                </h2>
                <p className="whitespace-pre-wrap text-sm text-atlas-text">
                  {caso.data.internalSummary}
                </p>
              </section>
            ) : null}

            <Historia
              eventos={historia.data?.events ?? []}
              cargando={historia.isLoading}
              error={historia.error}
            />
          </div>

          <aside className="space-y-4">
            <CaseActions caso={caso.data} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Dato({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-atlas-muted">
        {label}
      </p>
      <div className="mt-1 truncate text-sm text-atlas-text">{children}</div>
    </div>
  );
}

/**
 * La historia del expediente, en orden.
 *
 * Cada evento va encadenado por hash con el anterior: es la evidencia de que nadie escribió en la
 * base sorteando los disparadores. Aquí se enseña el relato; la verificación de la cadena vive en
 * `desk/channels/:id/integrity` y es de la conversación, no del caso.
 */
function Historia({
  eventos,
  cargando,
  error,
}: Readonly<{
  eventos: SupportCaseEvent[];
  cargando: boolean;
  error: unknown;
}>) {
  return (
    <section className="rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
        Historia del expediente
      </h2>
      {cargando ? <LoadingSkeleton rows={4} /> : null}
      {error ? <AccesoASoporte error={error} /> : null}
      {!cargando && !error && eventos.length === 0 ? (
        <p className="text-sm text-atlas-muted">
          Sin eventos registrados todavía.
        </p>
      ) : null}
      <ol className="space-y-3">
        {eventos.map((evento) => (
          <li
            key={evento.eventId}
            className="border-l-2 border-atlas-border pl-3 text-sm"
          >
            <p className="font-medium text-atlas-text">{evento.eventType}</p>
            <p className="text-xs text-atlas-muted">
              {formatDateTime(evento.occurredAt)} · {evento.actorType}
              {evento.actorId ? ` #${evento.actorId}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
