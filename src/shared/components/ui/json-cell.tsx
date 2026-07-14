import { CopyButton } from "./copy-button";

/**
 * Renders a compact JSON string (e.g. `{"sqlType":"bigint","nullable":false}`)
 * pretty-printed inside a table cell, with a copy button. Falls back to plain
 * text if the value isn't valid JSON.
 */
export function JsonCell({
  value,
}: Readonly<{ value: string | null | undefined }>) {
  if (!value) return <span className="text-atlas-muted">—</span>;
  const pretty = tryPrettyPrint(value);
  if (!pretty) return <span className="text-sm">{value}</span>;
  return (
    <div className="flex max-w-xs items-start gap-2">
      <pre className="atlas-scrollbar max-h-40 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 px-2 py-1.5 font-mono text-[11px] leading-4 text-slate-100">
        {pretty}
      </pre>
      <CopyButton value={pretty} className="mt-1" />
    </div>
  );
}

function tryPrettyPrint(value: string): string | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}
