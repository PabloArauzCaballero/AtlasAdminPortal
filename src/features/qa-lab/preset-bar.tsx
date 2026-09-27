import { Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { QaPayloadPreset } from "./payload-presets";

/** «Usar el ejemplo de esta operación», con su nota y el aviso del generador si lo hay. */
export function PresetBar({
  preset,
  onApply,
  notice,
}: Readonly<{
  preset?: QaPayloadPreset;
  onApply: () => void;
  notice: string | null;
}>) {
  if (!preset && !notice) return null;
  return (
    <div className="space-y-2">
      {preset ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-atlas-accentSoft bg-atlas-accentWash p-3">
          <Button variant="secondary" onClick={onApply}>
            Usar el ejemplo: {preset.label}
          </Button>
          <p className="text-xs text-atlas-text">{preset.notes}</p>
        </div>
      ) : null}
      {notice ? (
        <p
          className="flex items-start gap-1.5 text-xs text-atlas-muted"
          role="status"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}
    </div>
  );
}
