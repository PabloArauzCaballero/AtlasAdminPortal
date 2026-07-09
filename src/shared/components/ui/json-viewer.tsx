import { safeText } from "@/shared/lib/format";

export function JsonViewer({
  value,
  title,
}: Readonly<{ value: unknown; title?: string }>) {
  const content =
    typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
  return (
    <div className="overflow-hidden rounded-lg border border-atlas-border bg-slate-950 text-slate-50">
      {title ? (
        <div className="border-b border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300">
          {title}
        </div>
      ) : null}
      <pre className="atlas-scrollbar max-h-[520px] overflow-auto p-4 font-mono text-xs leading-5">
        {safeText(content)}
      </pre>
    </div>
  );
}
