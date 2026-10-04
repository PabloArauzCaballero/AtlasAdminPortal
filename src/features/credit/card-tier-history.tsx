import { formatDateTime } from "@/shared/lib/format";
import type {
  CardTierDefinition,
  CardTierOverrideRecord,
} from "./card-tier-types";

/** Estado de un ajuste del historial, en una palabra. */
export function overrideState(
  record: CardTierOverrideRecord,
  now: Date = new Date(),
): "Revocado" | "Vencido" | "Vigente" {
  if (record.revokedAt) return "Revocado";
  if (record.expiresAt && new Date(record.expiresAt) <= now) return "Vencido";
  return "Vigente";
}

/** Cada ajuste manual con su motivo, autor y cierre: quien audite ve qué pasó sin abrir la base. */
export function CardTierHistory({
  history,
  catalog,
}: Readonly<{
  history: CardTierOverrideRecord[];
  catalog: CardTierDefinition[];
}>) {
  const labelOf = (code: string) =>
    catalog.find((tier) => tier.code === code)?.label ?? code;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
        Historial de ajustes
      </h4>
      {history.length === 0 ? (
        <p className="text-sm text-atlas-muted">
          Nadie le ha puesto una tarjeta a mano.
        </p>
      ) : (
        <ol className="space-y-2" data-testid="historial-tarjeta">
          {history.map((record) => (
            <li
              key={record.overrideId}
              className="rounded-lg border border-atlas-border p-3 text-sm"
            >
              <p className="font-medium text-atlas-text">
                {labelOf(record.tierCode)}{" "}
                <span className="font-normal text-atlas-muted">
                  · {overrideState(record)}
                </span>
              </p>
              <p className="text-atlas-text">{record.reason}</p>
              <p className="text-xs text-atlas-muted">
                Desde {formatDateTime(record.validFrom)}
                {record.expiresAt
                  ? ` · vence ${formatDateTime(record.expiresAt)}`
                  : " · sin vencimiento"}
                {record.setByInternalUserId
                  ? ` · por usuario interno #${record.setByInternalUserId}`
                  : ""}
              </p>
              {record.revokedAt ? (
                <p className="text-xs text-atlas-muted">
                  Quitado {formatDateTime(record.revokedAt)}
                  {record.revokedByInternalUserId
                    ? ` por usuario interno #${record.revokedByInternalUserId}`
                    : ""}
                  {record.revokeReason ? `: ${record.revokeReason}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
