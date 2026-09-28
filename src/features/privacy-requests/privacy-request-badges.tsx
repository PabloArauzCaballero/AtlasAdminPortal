import { Badge } from "@/shared/components/ui/badges";
import { statusLabel } from "./labels";
import type { PrivacyRequest } from "./types";

const TONO: Record<string, "warning" | "info" | "success" | "muted"> = {
  received: "warning",
  in_progress: "info",
  completed: "success",
  rejected: "muted",
};

export function PrivacyStatusBadge({ status }: Readonly<{ status: string }>) {
  return (
    <Badge tone={TONO[status] ?? "default"} dot>
      {statusLabel(status)}
    </Badge>
  );
}

/**
 * El plazo en palabras. Vencida va en rojo y dice CUÁNTO: «vencida» a secas no distingue la que
 * se pasó ayer de la que lleva un mes, y es justo lo que decide por cuál empezar.
 */
export function DuePill({
  request,
}: Readonly<{ request: Pick<PrivacyRequest, "overdue" | "daysToDue"> }>) {
  if (request.daysToDue === null)
    return <span className="text-xs text-atlas-muted">Cerrada</span>;
  if (request.overdue)
    return (
      <Badge tone="critical" dot>
        {`Vencida hace ${Math.abs(request.daysToDue)} d`}
      </Badge>
    );
  return (
    <Badge tone={request.daysToDue <= 3 ? "warning" : "default"}>
      {request.daysToDue === 0 ? "Vence hoy" : `Quedan ${request.daysToDue} d`}
    </Badge>
  );
}
