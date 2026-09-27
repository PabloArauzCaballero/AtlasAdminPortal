import { Badge } from "@/shared/components/ui/badges";
import {
  ACCEPTANCE_LABELS,
  APPLICATION_STATUS_LABELS,
  labelOr,
  productStatusLabel,
} from "./credit-options";

type Tone = "success" | "warning" | "critical" | "info" | "muted" | "default";

/*
 * Insignias propias en vez de `StatusBadge`: aquél colorea por el código en inglés y aquí se
 * enseña la etiqueta en español. El código sigue en el `title` para quien lo busque en registros.
 */

const PRODUCT_TONE: Record<string, Tone> = {
  draft: "info",
  active: "success",
  suspended: "warning",
  retired: "muted",
};

const APPLICATION_TONE: Record<string, Tone> = {
  submitted: "info",
  under_review: "warning",
  approved: "success",
  rejected: "critical",
  cancelled: "muted",
  expired: "muted",
};

const ACCEPTANCE_TONE: Record<string, Tone> = {
  pending: "warning",
  accepted: "success",
  declined: "critical",
};

export function ProductStatusBadge({ value }: Readonly<{ value: string }>) {
  return (
    <span title={value}>
      <Badge tone={PRODUCT_TONE[value] ?? "default"} dot>
        {productStatusLabel(value)}
      </Badge>
    </span>
  );
}

export function ApplicationStatusBadge({ value }: Readonly<{ value: string }>) {
  return (
    <span title={value}>
      <Badge tone={APPLICATION_TONE[value] ?? "default"} dot>
        {labelOr(APPLICATION_STATUS_LABELS, value)}
      </Badge>
    </span>
  );
}

export function AcceptanceBadge({ value }: Readonly<{ value: string | null }>) {
  if (!value) return <span className="text-atlas-muted">No aplica</span>;
  return (
    <span title={value}>
      <Badge tone={ACCEPTANCE_TONE[value] ?? "default"}>
        {labelOr(ACCEPTANCE_LABELS, value)}
      </Badge>
    </span>
  );
}
