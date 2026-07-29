"use client";

import { useEffect, useState } from "react";

/**
 * Demo animada del árbol de decisión: primero recorre el camino feliz (cada
 * paso responde lo esperado y el dato viaja al siguiente) y después repite el
 * recorrido con el primer paso fallando, para que se vea el efecto dominó —
 * los pasos siguientes se ejecutan igual, pero con la variable sin resolver.
 * No consume backend: es un ejemplo dentro de la tarjeta del tutorial.
 */
const W = 300;
const H = 206;
const ROW_H = 62;
const BOX_X = 8;
const BOX_W = 184;
const BOX_H = 32;
const FRAME_MS = 1150;
const FRAMES = 10;

type State = "pending" | "ok" | "failed" | "at-risk";

const STEPS = [
  { method: "POST", route: "/onboarding/start", note: "extrae customerId" },
  { method: "GET", route: "/customers/{{customerId}}", note: "usa customerId" },
  { method: "POST", route: "/operations/sessions", note: "usa customerId" },
];

const COLOR: Record<State, { stroke: string; fill: string; ink: string }> = {
  pending: { stroke: "#cbd5e1", fill: "#ffffff", ink: "#64748b" },
  ok: { stroke: "#10b981", fill: "#ecfdf5", ink: "#047857" },
  failed: { stroke: "#ef4444", fill: "#fef2f2", ink: "#b91c1c" },
  "at-risk": { stroke: "#f59e0b", fill: "#fffbeb", ink: "#b45309" },
};

/** Guion de la animación: qué estado tiene cada paso en cada fotograma. */
function statesAt(frame: number): State[] {
  const happy: State[][] = [
    ["pending", "pending", "pending"],
    ["ok", "pending", "pending"],
    ["ok", "ok", "pending"],
    ["ok", "ok", "ok"],
    ["ok", "ok", "ok"],
  ];
  const broken: State[][] = [
    ["pending", "pending", "pending"],
    ["failed", "pending", "pending"],
    ["failed", "at-risk", "pending"],
    ["failed", "at-risk", "at-risk"],
    ["failed", "at-risk", "at-risk"],
  ];
  return frame < 5 ? happy[frame] : broken[frame - 5];
}

function boxY(index: number): number {
  return 6 + index * ROW_H;
}

export function DecisionTreeDemo() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setFrame((current) => (current + 1) % FRAMES),
      FRAME_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const states = statesAt(frame);
  const failing = frame >= 5;

  return (
    <div className="mt-3 rounded-lg border border-atlas-border bg-atlas-soft/50 p-2.5">
      <p className="mb-1 text-[0.6875rem] font-medium text-atlas-muted">
        {failing
          ? "Con el paso 1 fallando: el dato nunca se extrae"
          : "Camino feliz: cada paso responde y el dato viaja"}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          failing
            ? "Árbol de decisión con el primer paso fallando y los siguientes en riesgo"
            : "Árbol de decisión con los tres pasos respondiendo lo esperado"
        }
      >
        <defs>
          <marker
            id="demo-arrow"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {STEPS.map((step, index) => {
          const state = states[index];
          const color = COLOR[state];
          const y = boxY(index);
          const isLast = index === STEPS.length - 1;
          const dy = y + BOX_H + 13;
          const taken = state === "ok";
          return (
            <g key={step.route} opacity={state === "pending" ? 0.6 : 1}>
              <rect
                x={BOX_X}
                y={y}
                width={BOX_W}
                height={BOX_H}
                rx={8}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={1.4}
              />
              <text
                x={BOX_X + 9}
                y={y + 14}
                fontSize={8}
                fontWeight={700}
                fill={color.ink}
              >
                {`${index + 1}. ${step.method}`}
              </text>
              <text
                x={BOX_X + 9}
                y={y + 25}
                fontSize={8}
                fontFamily="ui-monospace, monospace"
                fill="#475569"
              >
                {step.route}
              </text>
              <text
                x={BOX_X + BOX_W - 8}
                y={y + 14}
                fontSize={7.5}
                textAnchor="end"
                fill={color.ink}
              >
                {step.note}
              </text>

              <polygon
                points={`${BOX_X + 40},${dy - 10} ${BOX_X + 74},${dy} ${BOX_X + 40},${dy + 10} ${BOX_X + 6},${dy}`}
                fill="#ffffff"
                stroke={
                  taken ? "#10b981" : state === "failed" ? "#ef4444" : "#cbd5e1"
                }
                strokeWidth={1.2}
              />
              <text
                x={BOX_X + 40}
                y={dy + 2.5}
                textAnchor="middle"
                fontSize={7}
                fill="#334155"
              >
                ¿200?
              </text>

              {isLast ? null : (
                <line
                  x1={BOX_X + 40}
                  y1={dy + 10}
                  x2={BOX_X + 40}
                  y2={boxY(index + 1)}
                  stroke={taken ? "#10b981" : "#cbd5e1"}
                  strokeWidth={taken ? 1.8 : 1}
                  markerEnd="url(#demo-arrow)"
                />
              )}
              <line
                x1={BOX_X + 74}
                y1={dy}
                x2={BOX_X + 110}
                y2={dy}
                stroke={state === "failed" ? "#ef4444" : "#e2e8f0"}
                strokeWidth={state === "failed" ? 1.8 : 1}
                strokeDasharray={state === "failed" ? undefined : "3 3"}
              />
              <text
                x={BOX_X + 114}
                y={dy + 3}
                fontSize={7.5}
                fill={state === "failed" ? "#b91c1c" : "#cbd5e1"}
              >
                {index === 0
                  ? "no → se pierde customerId"
                  : "no → paso marcado"}
              </text>
            </g>
          );
        })}

        <path
          d={`M ${BOX_X + BOX_W + 2} ${boxY(0) + 22} C 288 ${boxY(0) + 22}, 288 ${boxY(2) + 10}, ${BOX_X + BOX_W + 2} ${boxY(2) + 10}`}
          fill="none"
          stroke={failing ? "#ef4444" : "#6366f1"}
          strokeWidth={1.4}
          strokeDasharray={failing ? "4 3" : undefined}
        />
        <text
          x={262}
          y={boxY(1) + 20}
          fontSize={7.5}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fill={failing ? "#b91c1c" : "#4338ca"}
        >
          customerId
        </text>
      </svg>
      <p className="mt-1 text-[0.625rem] leading-4 text-atlas-muted">
        Verde: el estado HTTP era el esperado. Rojo: no lo era. Ámbar: el paso
        se ejecuta igual, pero con una variable que nadie llegó a extraer.
      </p>
    </div>
  );
}
