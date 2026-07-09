import { cn } from "@/shared/lib/cn";

type Tone =
  "default" | "success" | "warning" | "critical" | "info" | "pii" | "muted";

const toneClasses: Record<Tone, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  pii: "border-indigo-200 bg-indigo-50 text-indigo-700",
  muted: "border-slate-200 bg-slate-100 text-slate-500",
};

const dotClasses: Record<Tone, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-blue-500",
  pii: "bg-indigo-500",
  muted: "bg-slate-400",
};

export function Badge({
  children,
  tone = "default",
  className,
  dot = false,
}: Readonly<{
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold shadow-sm",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotClasses[tone],
            tone === "success" && "animate-pulse-ring",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

export function RiskBadge({ value }: Readonly<{ value?: string | null }>) {
  const normalized = value?.toUpperCase();
  const tone: Tone =
    normalized === "CRITICAL"
      ? "critical"
      : normalized === "HIGH"
        ? "warning"
        : normalized === "MEDIUM"
          ? "info"
          : "success";
  return (
    <Badge tone={value ? tone : "muted"} dot>
      {value ?? "Sin riesgo"}
    </Badge>
  );
}

export function ReviewStatusBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  const normalized = value?.toUpperCase();
  const tone: Tone =
    normalized === "APPROVED"
      ? "success"
      : normalized === "REJECTED"
        ? "critical"
        : normalized === "NEEDS_REVIEW"
          ? "warning"
          : "info";
  return <Badge tone={value ? tone : "muted"}>{value ?? "Sin revisión"}</Badge>;
}

export function StatusBadge({ value }: Readonly<{ value?: string | null }>) {
  const normalized = value?.toUpperCase();
  const tone: Tone = ["ACTIVE", "PASSED", "ENABLED", "OK"].includes(
    normalized ?? "",
  )
    ? "success"
    : ["FAILED", "DISABLED", "ERROR", "REJECTED"].includes(normalized ?? "")
      ? "critical"
      : ["NEEDS_REVIEW", "RUNNING", "QUEUED"].includes(normalized ?? "")
        ? "warning"
        : "default";
  return (
    <Badge tone={value ? tone : "muted"} dot>
      {value ?? "—"}
    </Badge>
  );
}

export function SeverityBadge({ value }: Readonly<{ value?: string | null }>) {
  const normalized = value?.toUpperCase();
  const tone: Tone =
    normalized === "CRITICAL"
      ? "critical"
      : normalized === "HIGH"
        ? "critical"
        : normalized === "MEDIUM"
          ? "warning"
          : normalized === "LOW"
            ? "info"
            : "default";
  return (
    <Badge tone={value ? tone : "muted"} dot>
      {value ?? "Sin severidad"}
    </Badge>
  );
}

export function ModuleBadge({ value }: Readonly<{ value?: string | null }>) {
  return (
    <Badge tone={value ? "info" : "muted"} className="font-mono normal-case">
      {value ?? "Sin módulo"}
    </Badge>
  );
}

export function PiiBadge({ value }: Readonly<{ value?: boolean | null }>) {
  return (
    <Badge tone={value ? "pii" : "muted"}>{value ? "PII" : "Sin PII"}</Badge>
  );
}

export function BooleanBadge({
  value,
  trueLabel = "Sí",
  falseLabel = "No",
  tone = "warning",
}: Readonly<{
  value?: boolean | null;
  trueLabel?: string;
  falseLabel?: string;
  tone?: Tone;
}>) {
  if (value === null || value === undefined) {
    return <Badge tone="muted">—</Badge>;
  }
  return (
    <Badge tone={value ? tone : "muted"}>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export function MethodBadge({ method }: Readonly<{ method?: string | null }>) {
  const normalized = method?.toUpperCase() ?? "—";
  const tone: Tone =
    normalized === "GET"
      ? "success"
      : normalized === "POST"
        ? "info"
        : normalized === "DELETE"
          ? "critical"
          : "warning";
  return (
    <Badge tone={method ? tone : "muted"} className="font-mono">
      {normalized}
    </Badge>
  );
}
