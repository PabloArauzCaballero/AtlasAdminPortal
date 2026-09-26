"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { formatNumber } from "@/shared/lib/format";
import {
  BAR_MAX_HEIGHT,
  HEIGHT,
  PADDING,
  TICK_MS,
  TOTAL_SECONDS,
  WIDTH,
  buildDemoTimeline,
  buildPath,
  x,
  y,
} from "./guide-stress-timeline";

// Réplica didáctica del gráfico real (`StressLatencyChart`): mismas variables
// (hits/seg, p95, promedio, errores) animada segundo a segundo, sin carga real.
export function GuideStressChart() {
  const timeline = useMemo(buildDemoTimeline, []);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [hoverSecond, setHoverSecond] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }

  function run() {
    if (intervalRef.current) return;
    if (prefersReducedMotion) {
      setProgress(TOTAL_SECONDS);
      return;
    }
    setProgress(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= TOTAL_SECONDS) {
          stop();
          return current;
        }
        return current + 1;
      });
    }, TICK_MS);
  }

  function reset() {
    stop();
    setProgress(0);
    setHoverSecond(null);
  }

  const shown = timeline.slice(0, progress + 1);
  const maxLatency = Math.max(...timeline.map((p) => p.p95LatencyMs), 1);
  const maxHits = Math.max(...timeline.map((p) => p.count), 1);
  const maxSecond = TOTAL_SECONDS;
  const barWidth = Math.max(2, ((WIDTH - PADDING * 2) / (maxSecond + 1)) * 0.7);
  const p95Path = buildPath(shown, maxSecond, maxLatency, "p95LatencyMs");
  const avgPath = buildPath(shown, maxSecond, maxLatency, "avgLatencyMs");
  const active = shown.find((p) => p.second === hoverSecond) ?? null;

  const totalRequests = shown.reduce((sum, p) => sum + p.count, 0);
  const totalErrors = shown.reduce((sum, p) => sum + p.errorCount, 0);
  const currentP95 = timeline[Math.min(progress, TOTAL_SECONDS)].p95LatencyMs;
  const done = progress >= TOTAL_SECONDS;

  return (
    <section className="rounded-xl border border-atlas-border bg-white shadow-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atlas-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-atlas-text">
            Evolución de latencia y hits durante el stress
          </h3>
          <p className="text-xs text-atlas-muted">
            Simulación didáctica · cada punto agrupa las solicitudes por
            segundo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={reset} disabled={running}>
            Reiniciar
          </Button>
          <Button
            variant="primary"
            onClick={run}
            isLoading={running}
            loadingText="Corriendo…"
          >
            {done ? "Repetir corrida" : "Simular corrida"}
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-atlas-border border-b border-atlas-border sm:grid-cols-4">
        <Stat
          label="Segundo"
          value={`${progress} / ${TOTAL_SECONDS}`}
          tone="accent"
        />
        <Stat label="Requests" value={formatNumber(totalRequests)} />
        <Stat
          label="p95 latencia"
          value={`${formatNumber(currentP95)} ms`}
          tone="info"
        />
        <Stat
          label="Errores"
          value={formatNumber(totalErrors)}
          tone={totalErrors > 0 ? "warning" : undefined}
        />
      </dl>

      <div className="px-4 pt-3">
        <div className="mb-2 flex min-h-[1.25rem] justify-end">
          {active ? (
            <div className="rounded-md bg-atlas-soft px-3 py-1 text-xs text-atlas-text">
              <span className="font-semibold">seg. {active.second}</span>
              {" · "}
              {formatNumber(active.count)} hits · p95{" "}
              {formatNumber(active.p95LatencyMs)} ms
              {active.errorCount > 0
                ? ` · ${formatNumber(active.errorCount)} errores`
                : ""}
            </div>
          ) : (
            <Legend />
          )}
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-64 w-full">
          <Axis maxLatency={maxLatency} maxSecond={maxSecond} />
          {shown.map((point) => {
            const barHeight = (point.count / maxHits) * BAR_MAX_HEIGHT;
            const cx = x(point.second, maxSecond);
            return (
              <rect
                key={`bar-${point.second}`}
                x={cx - barWidth / 2}
                y={HEIGHT - PADDING - barHeight}
                width={barWidth}
                height={barHeight}
                className={
                  hoverSecond === point.second
                    ? "fill-atlas-accent"
                    : "fill-atlas-accent/40"
                }
              />
            );
          })}
          <path
            d={avgPath}
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 5"
            strokeWidth="2"
            className="text-slate-500"
          />
          <path
            d={p95Path}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-blue-700"
          />
          {shown.map((point) => (
            <circle
              key={`pt-${point.second}`}
              cx={x(point.second, maxSecond)}
              cy={y(point.p95LatencyMs, maxLatency)}
              r={hoverSecond === point.second ? 4.5 : 3}
              className={
                point.errorCount > 0 ? "fill-red-600" : "fill-blue-700"
              }
            />
          ))}
          {shown.map((point) => (
            <rect
              key={`hit-${point.second}`}
              x={x(point.second, maxSecond) - barWidth}
              y={0}
              width={barWidth * 2}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverSecond(point.second)}
              onMouseLeave={() =>
                setHoverSecond((current) =>
                  current === point.second ? null : current,
                )
              }
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: Readonly<{
  label: string;
  value: string;
  tone?: "accent" | "info" | "warning";
}>) {
  const toneClass =
    tone === "accent"
      ? "text-atlas-accent"
      : tone === "info"
        ? "text-blue-700"
        : tone === "warning"
          ? "text-amber-700"
          : "text-atlas-text";
  return (
    <div className="px-4 py-3">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-atlas-muted">
        {label}
      </dt>
      <dd
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${toneClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-atlas-muted">
      <span>barra: hits por segundo</span>
      <span>línea sólida: p95</span>
      <span>línea punteada: promedio</span>
      <span>punto rojo: segundo con errores</span>
    </div>
  );
}

function Axis({
  maxLatency,
  maxSecond,
}: Readonly<{ maxLatency: number; maxSecond: number }>) {
  return (
    <g className="text-slate-300">
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="currentColor"
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={HEIGHT - PADDING}
        stroke="currentColor"
      />
      <text x={PADDING} y={18} className="fill-slate-500 text-[11px]">
        {maxLatency} ms
      </text>
      <text
        x={PADDING}
        y={HEIGHT - PADDING - 4}
        className="fill-slate-500 text-[11px]"
      >
        0 ms
      </text>
      <text x={PADDING} y={HEIGHT - 8} className="fill-slate-500 text-[11px]">
        0s
      </text>
      <text
        x={WIDTH - 92}
        y={HEIGHT - 8}
        className="fill-slate-500 text-[11px]"
      >
        {maxSecond}s
      </text>
    </g>
  );
}
