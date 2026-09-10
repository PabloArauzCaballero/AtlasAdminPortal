"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertTriangle,
  Boxes,
  CircleHelp,
  Code2,
  Cog,
  Database,
  Globe,
  Megaphone,
  Send,
  ShieldCheck,
  UserRound,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { GraphNode } from "../types";

export type FlowNodeData = GraphNode & { selected?: boolean; dimmed?: boolean };

/**
 * Cada tipo tiene icono y borde propios: no se distingue sólo por color (accesibilidad) y el
 * `UNKNOWN` se pinta punteado a propósito — es un hueco declarado, no un nodo más.
 */
const STYLE: Record<
  GraphNode["type"],
  { icon: LucideIcon; border: string; eyebrow: string }
> = {
  CLIENT: { icon: Globe, border: "border-sky-300", eyebrow: "CLIENTE" },
  ACTOR: {
    icon: UserRound,
    border: "border-sky-300",
    eyebrow: "ROL / PERMISO",
  },
  ENDPOINT: {
    icon: Waypoints,
    border: "border-atlas-accent",
    eyebrow: "ENDPOINT",
  },
  GUARD: {
    icon: ShieldCheck,
    border: "border-amber-300",
    eyebrow: "AUTORIZACIÓN",
  },
  HANDLER: { icon: Code2, border: "border-emerald-300", eyebrow: "HANDLER" },
  CONTROLLER: {
    icon: Boxes,
    border: "border-emerald-300",
    eyebrow: "CONTROLLER",
  },
  SERVICE: { icon: Cog, border: "border-emerald-300", eyebrow: "SERVICE" },
  REPOSITORY: {
    icon: Boxes,
    border: "border-emerald-300",
    eyebrow: "REPOSITORY",
  },
  DATABASE: { icon: Database, border: "border-violet-300", eyebrow: "TABLA" },
  ERROR: {
    icon: AlertTriangle,
    border: "border-red-300",
    eyebrow: "RAMA DE ERROR",
  },
  BLOCK_CALL: {
    icon: Send,
    border: "border-orange-300",
    eyebrow: "HTTP SALIENTE",
  },
  // Un evento que el flujo publica: el flujo no termina al responder. El texto dice quién lo recoge,
  // no si avisa a alguien, que se mide en «Trabajo pendiente».
  EVENT: {
    icon: Megaphone,
    border: "border-pink-300",
    eyebrow: "EVENTO PUBLICADO",
  },
  UNKNOWN: {
    icon: CircleHelp,
    border: "border-dashed border-atlas-muted",
    eyebrow: "SIN RESOLVER",
  },
};

export function FlowNodeCard({
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) {
  const style = STYLE[data.type];
  const Icon = style.icon;
  const risk = data.meta?.risk as string | undefined;
  return (
    <div
      className={cn(
        "w-[232px] rounded-lg border-2 bg-white px-3 py-2 text-left shadow-subtle transition-opacity",
        style.border,
        selected && "ring-2 ring-atlas-accent",
        data.dimmed && "opacity-30",
      )}
      data-node-type={data.type}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !bg-atlas-muted"
      />
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-atlas-muted">
        <Icon className="h-3 w-3" aria-hidden />
        {style.eyebrow}
        {risk ? (
          <span
            className={cn(
              "ml-auto rounded px-1 text-[10px]",
              risk === "CRITICAL" && "bg-red-50 text-red-700",
              risk === "HIGH" && "bg-amber-50 text-amber-700",
              risk === "MEDIUM" && "bg-sky-50 text-sky-700",
              risk === "LOW" && "bg-emerald-50 text-emerald-700",
            )}
          >
            {risk}
          </span>
        ) : null}
      </div>
      <div
        className="truncate font-mono text-xs text-atlas-text"
        title={data.label}
      >
        {data.label}
      </div>
      {data.sublabel ? (
        <div
          className="truncate text-[11px] text-atlas-muted"
          title={data.sublabel}
        >
          {data.sublabel}
        </div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !bg-atlas-muted"
      />
    </div>
  );
}
