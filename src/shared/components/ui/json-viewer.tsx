import { safeText } from "@/shared/lib/format";
import { CopyButton } from "./copy-button";

export function JsonViewer({
  value,
  title,
}: Readonly<{ value: unknown; title?: string }>) {
  const content =
    typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
  return (
    <div className="overflow-hidden rounded-lg border border-atlas-border bg-slate-950 text-slate-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-2">
        <span className="text-xs font-semibold text-slate-300">
          {title ?? "JSON"}
        </span>
        <CopyButton
          value={safeText(content)}
          className="border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
        />
      </div>
      <pre className="atlas-scrollbar max-h-[520px] overflow-auto p-4 font-mono text-xs leading-5">
        {safeText(content)}
      </pre>
    </div>
  );
}
