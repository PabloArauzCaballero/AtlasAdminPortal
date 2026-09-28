import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import { statusLabel } from "./labels";
import type { PrivacyRequestHistoryEntry } from "./types";

/** El historial sale de la auditoría del backend: quién, cuándo, de qué estado a cuál y por qué. */
export function PrivacyRequestHistory({
  history,
}: Readonly<{ history: PrivacyRequestHistoryEntry[] }>) {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Historial"
        description="Cada paso de la solicitud, con autor y motivo."
      />
      {history.length === 0 ? (
        <p className="text-sm text-atlas-muted">
          Sin pasos registrados: la solicitud es anterior a la auditoría de esta
          cola.
        </p>
      ) : (
        <ol className="space-y-3">
          {history.map((paso, indice) => (
            <li
              key={`${paso.occurredAt ?? ""}-${indice}`}
              className="border-l-2 border-atlas-border pl-3"
            >
              <p className="text-sm font-medium text-atlas-text">
                {paso.action === "created"
                  ? "El cliente la envió desde la app"
                  : `${statusLabel(paso.fromStatus)} → ${statusLabel(paso.toStatus)}`}
              </p>
              <p className="text-xs text-atlas-muted">
                {formatDateTime(paso.occurredAt)}
                {paso.action === "transition"
                  ? ` · ${paso.actorName ?? paso.actorType ?? "Autor desconocido"}`
                  : ""}
              </p>
              {paso.reason ? (
                <p className="mt-1 text-sm text-atlas-text">{paso.reason}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
