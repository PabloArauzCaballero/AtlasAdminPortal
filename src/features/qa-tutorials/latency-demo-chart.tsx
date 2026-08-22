"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Demo animada de latencia bajo carga: revela peticiones una a una (como si la
 * prueba de stress las fuera procesando) y dibuja la curva de latencia con la
 * línea de umbral p95. No consume backend: es un ejemplo visual dentro del
 * tutorial para explicar qué se mide y cómo se lee.
 */
const W = 300;
const H = 110;
const MAX_MS = 1000;
const P95_MS = 800;
const STEP_MS = 140;

// Serie sintética determinista: latencia estable con un par de picos, como una
// corrida real donde algunas peticiones se degradan bajo carga.
const SERIES = [
  180, 205, 190, 235, 300, 260, 220, 285, 520, 340, 300, 275, 260, 305, 910,
  430, 360, 320, 300, 285, 345, 300, 640, 380, 340, 325, 300, 280, 300, 330,
];

function x(i: number): number {
  return (i / (SERIES.length - 1)) * W;
}
function y(ms: number): number {
  return H - Math.min(ms, MAX_MS) * (H / MAX_MS);
}
function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)
  ];
}

export function LatencyDemoChart() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCount((current) => (current >= SERIES.length ? 1 : current + 1));
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  const shown = useMemo(() => SERIES.slice(0, count), [count]);
  const linePoints = shown.map((ms, i) => `${x(i)},${y(ms)}`).join(" ");
  const areaPoints = `0,${H} ${linePoints} ${x(shown.length - 1)},${H}`;
  const currentP95 = p95(shown);
  const overThreshold = currentP95 > P95_MS;

  return (
    <div className="mt-3 rounded-lg border border-atlas-border bg-atlas-soft/50 p-2.5">
      <div className="mb-1 flex items-center justify-between text-[0.6875rem] font-medium">
        <span className="text-atlas-muted">
          {count}/{SERIES.length} peticiones procesadas
        </span>
        <span className={overThreshold ? "text-red-600" : "text-emerald-600"}>
          p95 {currentP95} ms {overThreshold ? "· supera umbral" : "· OK"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-24 w-full"
        role="img"
        aria-label={`Gráfico de latencia: ${count} de ${SERIES.length} peticiones, p95 ${currentP95} milisegundos`}
        preserveAspectRatio="none"
      >
        {/* Umbral p95 */}
        <line
          x1={0}
          x2={W}
          y1={y(P95_MS)}
          y2={y(P95_MS)}
          stroke="#dc2626"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <polygon points={areaPoints} fill="rgba(99,102,241,0.15)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {shown.map((ms, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(ms)}
            r={i === shown.length - 1 ? 3 : 1.6}
            fill={ms > P95_MS ? "#dc2626" : "#6366f1"}
          />
        ))}
      </svg>
      <p className="mt-1 text-[0.625rem] leading-4 text-atlas-muted">
        La línea roja es el umbral p95 ({P95_MS} ms). Los puntos rojos son
        peticiones que lo superan: si aparecen bajo carga, el endpoint se
        degrada.
      </p>
    </div>
  );
}
