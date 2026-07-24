import {
  CheckCircle2,
  CircleDashed,
  PlayCircle,
  RefreshCw,
  SkipForward,
  type LucideIcon,
} from "lucide-react";
import type { TutorialStatus } from "./types";

/** Presentación unificada de cada estado de tutorial (badge, icono, color). */
export type StatusVisual = Readonly<{
  label: string;
  Icon: LucideIcon;
  /** Clases tailwind para el chip de estado. */
  chipClass: string;
  /** Texto de la acción del botón según el estado. */
  actionLabel: string;
}>;

const visuals: Record<TutorialStatus, StatusVisual> = {
  "not-started": {
    label: "Disponible",
    Icon: PlayCircle,
    chipClass: "border-slate-200 bg-slate-50 text-slate-600",
    actionLabel: "Iniciar tutorial",
  },
  "in-progress": {
    label: "En progreso",
    Icon: CircleDashed,
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    actionLabel: "Continuar tutorial",
  },
  completed: {
    label: "Completado",
    Icon: CheckCircle2,
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    actionLabel: "Repetir tutorial",
  },
  skipped: {
    label: "Omitido",
    Icon: SkipForward,
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
    actionLabel: "Retomar tutorial",
  },
  "needs-update": {
    label: "Contenido nuevo",
    Icon: RefreshCw,
    chipClass: "border-violet-200 bg-violet-50 text-violet-700",
    actionLabel: "Ver novedades",
  },
};

export function statusVisual(status: TutorialStatus): StatusVisual {
  return visuals[status];
}
