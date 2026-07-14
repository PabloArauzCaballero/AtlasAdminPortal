import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { ToolHealth } from "./types";

export type ToolLiveState = "UP" | "DOWN" | "NO_PROBE";

/**
 * Deriva el estado vivo de una herramienta a partir de `isHealthy`, la misma
 * señal que usa el monitor del backend para disparar las notificaciones de
 * "servicio caído/recuperado". Todas las vistas deben juzgar la salud con esta
 * función — nunca con `tool.status`, que es el estado de catálogo (ACTIVE/…)
 * y no refleja si la herramienta responde.
 */
export function toolLiveState(tool: ToolHealth): ToolLiveState {
  if (tool.isHealthy === true) return "UP";
  if (tool.isHealthy === false) return "DOWN";
  return "NO_PROBE";
}

const LIVE_STATE_UI: Record<
  ToolLiveState,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  UP: {
    label: "Operativa",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  DOWN: {
    label: "Caída",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
  NO_PROBE: {
    label: "Sin probe activo",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    icon: MinusCircle,
  },
};

export function ToolLiveBadge({
  tool,
  className,
}: Readonly<{ tool: ToolHealth; className?: string }>) {
  const ui = LIVE_STATE_UI[toolLiveState(tool)];
  const Icon = ui.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors",
        ui.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {ui.label}
    </span>
  );
}
