"use client";

import { useEffect, useState } from "react";

/**
 * Demo animada del árbol de decisión del recorrido: tres etapas del catálogo
 * de flujos, cada una con su endpoint, y la bifurcación declarada — si la
 * verificación sale bien el proceso avanza; si falla, se deriva por la rama de
 * excepción. No consume backend: es el ejemplo visual de la tarjeta.
 */
const W = 300;
const H = 194;
const ROW_H = 58;
const BOX_X = 6;
const BOX_W = 196;
const BOX_H = 44;
const FRAME_MS = 1200;
const FRAMES = 8;

const OK = "#10b981";
const ERR = "#ef4444";
const IDLE = "#cbd5e1";

const STAGES = [
  {
    name: "Registro",
    actor: "cliente",
    color: "#6366f1",
    method: "POST",
    route: "/customer-onboarding/start",
  },
  {
    name: "Verificación de identidad",
    actor: "interno",
    color: "#0ea5e9",
    method: "POST",
    route: "/identity-verification",
  },
  {
    name: "Decisión de crédito",
    actor: "interno",
    color: "#0ea5e9",
    method: "POST",
    route: "/credit/applications/:id/decision",
  },
];

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

  // 0-3: camino principal. 4-7: la verificación falla y se toma la rama roja.
  const failing = frame >= 4;
  const reached = failing ? Math.min(frame - 4, 2) : Math.min(frame, 2);

  return (
    <div className="mt-3 rounded-lg border border-atlas-border bg-atlas-soft/50 p-2.5">
      <p className="mb-1 text-[0.6875rem] font-medium text-atlas-muted">
        {failing
          ? "Si la verificación falla: rama de excepción declarada"
          : "Camino principal: cada etapa habilita la siguiente"}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          failing
            ? "Flujo con la verificación fallando y derivando a evidencia externa"
            : "Flujo con las tres etapas avanzando por el camino principal"
        }
      >
        <defs>
          <marker
            id="wf-demo-arrow"
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

        {STAGES.map((stage, index) => {
          const y = boxY(index);
          const active = index <= reached;
          const isFailing = failing && index === 1 && reached >= 1;
          const stroke = isFailing ? ERR : active ? stage.color : IDLE;
          return (
            <g key={stage.name} opacity={active ? 1 : 0.5}>
              <rect
                x={BOX_X}
                y={y}
                width={BOX_W}
                height={BOX_H}
                rx={9}
                fill={isFailing ? "#fef2f2" : "#ffffff"}
                stroke={stroke}
                strokeWidth={1.4}
              />
              <rect
                x={BOX_X}
                y={y}
                width={3.5}
                height={BOX_H}
                rx={2}
                fill={stroke}
              />
              <text
                x={BOX_X + 10}
                y={y + 15}
                fontSize={8.5}
                fontWeight={700}
                fill="#0f172a"
              >
                {stage.name}
              </text>
              <text
                x={BOX_X + BOX_W - 8}
                y={y + 15}
                fontSize={7}
                textAnchor="end"
                fill={stroke}
              >
                {stage.actor}
              </text>
              <rect
                x={BOX_X + 10}
                y={y + 22}
                width={30}
                height={13}
                rx={4}
                fill="#059669"
              />
              <text
                x={BOX_X + 25}
                y={y + 31}
                textAnchor="middle"
                fontSize={7}
                fontWeight={700}
                fontFamily="ui-monospace, monospace"
                fill="#ffffff"
              >
                {stage.method}
              </text>
              <text
                x={BOX_X + 45}
                y={y + 31.5}
                fontSize={7.5}
                fontFamily="ui-monospace, monospace"
                fill="#475569"
              >
                {stage.route}
              </text>

              {index < STAGES.length - 1 ? (
                <line
                  x1={BOX_X + 26}
                  y1={y + BOX_H}
                  x2={BOX_X + 26}
                  y2={boxY(index + 1)}
                  stroke={
                    index < reached && !(failing && index === 1) ? OK : IDLE
                  }
                  strokeWidth={index < reached ? 1.8 : 1}
                  markerEnd="url(#wf-demo-arrow)"
                />
              ) : null}
              {index < STAGES.length - 1 ? (
                <text
                  x={BOX_X + 32}
                  y={y + BOX_H + 9}
                  fontSize={7}
                  fill="#64748b"
                >
                  {index === 1 && failing ? "" : "si sale bien"}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Rama de excepción: sólo se ilumina cuando la verificación falla. */}
        <path
          d={`M ${BOX_X + BOX_W} ${boxY(1) + 22} C 250 ${boxY(1) + 22}, 250 ${boxY(1) + 68}, ${BOX_X + BOX_W} ${boxY(1) + 68}`}
          fill="none"
          stroke={failing && reached >= 1 ? ERR : IDLE}
          strokeWidth={failing && reached >= 1 ? 1.8 : 1}
          strokeDasharray="5 4"
        />
        <rect
          x={214}
          y={boxY(1) + 30}
          width={80}
          height={30}
          rx={8}
          fill={failing && reached >= 1 ? "#fef2f2" : "#f8fafc"}
          stroke={failing && reached >= 1 ? ERR : IDLE}
        />
        <text
          x={254}
          y={boxY(1) + 44}
          textAnchor="middle"
          fontSize={7.5}
          fontWeight={600}
          fill={failing && reached >= 1 ? "#b91c1c" : "#94a3b8"}
        >
          si falla →
        </text>
        <text
          x={254}
          y={boxY(1) + 54}
          textAnchor="middle"
          fontSize={7.5}
          fill={failing && reached >= 1 ? "#b91c1c" : "#94a3b8"}
        >
          evidencia externa
        </text>
      </svg>
      <p className="mt-1 text-[0.625rem] leading-4 text-atlas-muted">
        Cada caja es una etapa del catálogo con su endpoint real. Las flechas
        llevan la condición: verde si sale bien, roja la rama de excepción.
      </p>
    </div>
  );
}
