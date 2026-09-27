"use client";

import { NotificationChannelBadge } from "@/features/notifications/notification-columns";
import { formatNumber } from "@/shared/lib/format";
import type { CampaignTotals, NotificationCampaign } from "./types";

const SEGMENTS: {
  key: keyof Omit<CampaignTotals, "total" | "read">;
  label: string;
  bar: string;
}[] = [
  { key: "delivered", label: "Entregados", bar: "bg-emerald-500" },
  { key: "pending", label: "Por salir", bar: "bg-slate-300" },
  { key: "failed", label: "Fallidos", bar: "bg-red-500" },
  { key: "cancelled", label: "Anulados", bar: "bg-slate-500" },
];

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/**
 * Avance del envío, contado desde los avisos reales (el servidor no guarda contadores aparte).
 * «Entregados» agrupa enviado, entregado y leído; «Por salir» es todo lo que aún no terminó.
 */
export function CampaignMetrics({
  campaign,
}: Readonly<{ campaign: NotificationCampaign }>) {
  const totals = campaign.metrics?.totals;
  if (!totals || totals.total === 0) {
    return (
      <p className="text-sm text-atlas-muted">
        Todavía no hay avisos: se generan cuando la campaña empieza a enviar.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-atlas-soft"
          role="img"
          aria-label={`${percent(totals.delivered, totals.total)} % entregado de ${totals.total} avisos`}
        >
          {SEGMENTS.map((segment) => (
            <span
              key={segment.key}
              className={segment.bar}
              style={{
                width: `${percent(totals[segment.key], totals.total)}%`,
              }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-atlas-muted">
          {SEGMENTS.map((segment) => (
            <li key={segment.key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${segment.bar}`} />
              {`${segment.label}: ${formatNumber(totals[segment.key])} (${percent(totals[segment.key], totals.total)} %)`}
            </li>
          ))}
          <li>{`Leídos: ${formatNumber(totals.read)}`}</li>
        </ul>
      </div>
      <div className="overflow-x-auto rounded-xl border border-atlas-border">
        <table className="min-w-full text-sm">
          <thead className="bg-atlas-soft text-left text-xs text-atlas-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Canal</th>
              <th className="px-3 py-2 text-right font-medium">Avisos</th>
              <th className="px-3 py-2 text-right font-medium">Entregados</th>
              <th className="px-3 py-2 text-right font-medium">Por salir</th>
              <th className="px-3 py-2 text-right font-medium">Fallidos</th>
              <th className="px-3 py-2 text-right font-medium">Anulados</th>
              <th className="px-3 py-2 text-right font-medium">Leídos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {(campaign.metrics?.channels ?? []).map((row) => (
              <tr key={row.channel}>
                <td className="px-3 py-2">
                  <NotificationChannelBadge value={row.channel} />
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(row.total)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(row.delivered)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(row.pending)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(row.failed)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(row.cancelled)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(row.read)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
