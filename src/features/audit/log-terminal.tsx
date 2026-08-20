"use client";

import { useMemo, useState } from "react";
import {
  Bug,
  CircleAlert,
  CircleDot,
  Info,
  OctagonAlert,
  Radio,
  Search,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  countByLevel,
  logClock,
  type BackendLogLevel,
  type BackendLogLine,
} from "./backend-log-line";

/**
 * Una terminal que se lee como los logs del backend, no como su JSON.
 *
 * Cada línea se alinea en columnas fijas —hora · nivel · contexto · mensaje— para que el ojo pueda
 * recorrer una sola columna hacia abajo, que es como se busca en un log. El `correlationId` va al
 * final y solo cuando existe: es la llave con la que se salta de aquí a la auditoría SQL de ese
 * mismo request.
 */

const LEVEL_STYLE: Record<
  BackendLogLevel,
  { label: string; text: string; chip: string; Icon: typeof Info }
> = {
  fatal: {
    label: "FATAL",
    text: "text-rose-200",
    chip: "bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/40",
    Icon: OctagonAlert,
  },
  error: {
    label: "ERROR",
    text: "text-rose-200",
    chip: "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30",
    Icon: CircleAlert,
  },
  warn: {
    label: "WARN",
    text: "text-amber-100",
    chip: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
    Icon: TriangleAlert,
  },
  log: {
    label: "INFO",
    text: "text-slate-100",
    chip: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
    Icon: Info,
  },
  debug: {
    label: "DEBUG",
    text: "text-slate-400",
    chip: "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-400/30",
    Icon: Bug,
  },
  verbose: {
    label: "TRACE",
    text: "text-slate-500",
    chip: "bg-slate-500/10 text-slate-400 ring-1 ring-inset ring-slate-500/25",
    Icon: CircleDot,
  },
  unknown: {
    label: "RAW",
    text: "text-emerald-200",
    chip: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25",
    Icon: CircleDot,
  },
};

/** El orden en que se ofrecen los filtros: de lo que urge a lo que solo estorba. */
const FILTER_ORDER: BackendLogLevel[] = [
  "fatal",
  "error",
  "warn",
  "log",
  "debug",
  "verbose",
  "unknown",
];

export function LogTerminal({
  title,
  lines,
  live = false,
  actions,
  emptyText = "Sin líneas para el filtro aplicado.",
}: Readonly<{
  title: string;
  lines: BackendLogLine[];
  live?: boolean;
  actions?: React.ReactNode;
  emptyText?: string;
}>) {
  const [levels, setLevels] = useState<Set<BackendLogLevel>>(new Set());
  const [needle, setNeedle] = useState("");

  const counts = useMemo(() => countByLevel(lines), [lines]);
  const visible = useMemo(() => {
    const query = needle.trim().toLowerCase();
    return lines.filter((line) => {
      if (levels.size > 0 && !levels.has(line.level)) return false;
      if (!query) return true;
      return (
        line.message.toLowerCase().includes(query) ||
        (line.context ?? "").toLowerCase().includes(query) ||
        (line.correlationId ?? "").toLowerCase().includes(query)
      );
    });
  }, [lines, levels, needle]);

  function toggleLevel(level: BackendLogLevel) {
    setLevels((current) => {
      const next = new Set(current);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1120] shadow-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </span>
        <span className="truncate font-mono text-xs text-slate-300">
          {title}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {visible.length === lines.length
            ? `${lines.length} líneas`
            : `${visible.length}/${lines.length} líneas`}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse" aria-hidden />
            live
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {actions}
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1">
            <Search className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            <input
              value={needle}
              onChange={(event) => setNeedle(event.target.value)}
              placeholder="filtrar…"
              aria-label="Filtrar líneas del log"
              className="w-28 bg-transparent font-mono text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:w-40"
            />
          </label>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 bg-slate-900/40 px-4 py-2">
        {FILTER_ORDER.filter((level) => counts[level] > 0).map((level) => {
          const style = LEVEL_STYLE[level];
          const active = levels.has(level);
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              onClick={() => toggleLevel(level)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] transition-opacity",
                style.chip,
                levels.size > 0 && !active ? "opacity-40" : "opacity-100",
              )}
            >
              <style.Icon className="h-3 w-3" aria-hidden />
              {style.label}
              <span className="text-slate-400">{counts[level]}</span>
            </button>
          );
        })}
      </div>

      <div className="atlas-scrollbar max-h-[560px] overflow-auto px-2 py-2 font-mono text-xs leading-5">
        {visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-slate-500">{emptyText}</p>
        ) : (
          visible.map((line) => <LogRow key={line.index} line={line} />)
        )}
      </div>
    </div>
  );
}

function LogRow({ line }: Readonly<{ line: BackendLogLine }>) {
  const style = LEVEL_STYLE[line.level];
  const severe = line.level === "error" || line.level === "fatal";
  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_auto_1fr] gap-x-2 rounded px-2 py-0.5 hover:bg-slate-800/50",
        severe && "bg-rose-950/30",
      )}
    >
      <span className="tabular-nums text-slate-500">
        {logClock(line.timestamp)}
      </span>
      <span
        className={cn(
          "inline-flex w-[62px] shrink-0 items-center gap-1 rounded px-1 text-[10px] uppercase",
          style.chip,
        )}
      >
        <style.Icon className="h-2.5 w-2.5" aria-hidden />
        {style.label}
      </span>
      <span className="min-w-0">
        {line.context ? (
          <span className="text-fuchsia-300">[{line.context}] </span>
        ) : null}
        <span className={cn("whitespace-pre-wrap break-words", style.text)}>
          {line.message}
        </span>
        {line.correlationId ? (
          <span className="ml-2 text-slate-600">
            cid=<span className="text-cyan-400">{line.correlationId}</span>
          </span>
        ) : null}
        {line.stack ? (
          <pre className="mt-1 whitespace-pre-wrap break-words border-l-2 border-rose-500/40 pl-2 text-[11px] text-rose-300/80">
            {line.stack}
          </pre>
        ) : null}
      </span>
    </div>
  );
}
