import { cn } from "@/shared/lib/cn";
import { formatBoolean, safeText } from "@/shared/lib/format";

type Item = {
  label: string;
  value: unknown;
  mono?: boolean;
  tone?: "default" | "success" | "warning" | "critical" | "muted";
};

export function KeyValueGrid({ items }: Readonly<{ items: Item[] }>) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <KeyValueItem key={item.label} item={item} />
      ))}
    </dl>
  );
}

export function KeyValueSection({
  title,
  description,
  items,
}: Readonly<{ title: string; description?: string; items: Item[] }>) {
  return (
    <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
      <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-atlas-text">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-atlas-muted">{description}</p>
        ) : null}
      </div>
      <div className="p-5">
        <KeyValueGrid items={items} />
      </div>
    </section>
  );
}

function KeyValueItem({ item }: Readonly<{ item: Item }>) {
  const value = resolveValue(item.value);
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 transition-colors",
        toneClass(item.tone),
      )}
    >
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-atlas-muted">
        {item.label}
      </dt>
      <dd
        className={cn(
          "mt-2 min-h-5 break-words text-sm font-medium leading-6 text-atlas-text",
          item.mono && "font-mono text-xs",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function resolveValue(value: unknown) {
  if (typeof value === "boolean") return formatBoolean(value);
  return safeText(value);
}

function toneClass(tone: Item["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-100 bg-emerald-50/50";
    case "warning":
      return "border-amber-100 bg-amber-50/50";
    case "critical":
      return "border-red-100 bg-red-50/50";
    case "muted":
      return "border-slate-200 bg-slate-50";
    default:
      return "border-atlas-border";
  }
}
