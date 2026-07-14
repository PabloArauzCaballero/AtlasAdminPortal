import { cn } from "@/shared/lib/cn";
import { CopyableCode } from "@/shared/components/ui/copy-button";
import { formatBoolean, safeText } from "@/shared/lib/format";

type Item = {
  label: string;
  value: unknown;
  mono?: boolean;
  tone?: "default" | "success" | "warning" | "critical" | "muted";
};

export function KeyValueGrid({ items }: Readonly<{ items: Item[] }>) {
  return (
    <div className="atlas-scrollbar max-h-[560px] overflow-auto rounded-xl border border-atlas-border">
      <dl className="min-w-full divide-y divide-slate-100">
        {items.map((item) => (
          <KeyValueItem key={item.label} item={item} />
        ))}
      </dl>
    </div>
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
        "grid grid-cols-1 gap-1 px-4 py-3 transition-colors odd:bg-white even:bg-slate-50/60 sm:grid-cols-[220px_1fr] sm:items-start sm:gap-4",
        toneClass(item.tone),
      )}
    >
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-atlas-muted">
        {item.label}
      </dt>
      <dd className="min-h-5 break-words text-sm font-medium leading-6 text-atlas-text">
        {item.mono && typeof value === "string" ? (
          <CopyableCode value={value} />
        ) : (
          value
        )}
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
      return "border-l-4 border-l-emerald-400";
    case "warning":
      return "border-l-4 border-l-amber-400";
    case "critical":
      return "border-l-4 border-l-red-400";
    case "muted":
      return "opacity-70";
    default:
      return "";
  }
}
