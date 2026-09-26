"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import { engineUrl } from "@/shared/decision-engine/engine-links";

/**
 * Dónde se escribe la política de riesgo, ahora que hay un Motor.
 *
 * ## Por qué esta pantalla dejó de dejar editar
 *
 * Atlas tiene su propio lenguaje de reglas (`risk-rule-expression`) y su propio evaluador
 * (`risk-ruleset-evaluator`), y este portal permitía crear y ACTIVAR versiones de política con
 * ellos. Eso es un segundo motor de decisión: dos sitios donde alguien escribe la regla que aprueba
 * o rechaza a una persona, y sólo uno de los dos —el Motor— tiene aprobación, segregación de
 * funciones y auditoría encadenada. Escribir la política aquí producía una regla que competía con la
 * del Motor sin su gobierno, y nadie podía decir después cuál se aplicó.
 *
 * ## Qué se queda y por qué
 *
 * El ruleset local NO se retira: `RiskPolicyDecisionService` lo usa como DEGRADACIÓN cuando el Motor
 * no responde, y eso es deliberado —esto no concede dinero, y no dar de alta clientes por una avería
 * del Motor sería peor—. Lo que se queda aquí es la lectura: qué política local está vigente por si
 * hay que caer a ella. Lo que se va es la autoría.
 */
export function AvisoDeAutoriaEnElMotor() {
  const enlace = engineUrl("/risk-governance");

  return (
    <section className="mb-6 rounded-2xl border border-atlas-info/30 bg-atlas-info/5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
        <ShieldCheck className="h-4 w-4 text-atlas-info" aria-hidden />
        La política de riesgo se escribe en el Motor de Decisión
      </h2>
      <p className="mt-2 text-sm leading-6 text-atlas-text">
        Esta pantalla es de <strong>consulta</strong>. Las reglas que deciden
        aprobar, revisar o rechazar viven en los artefactos versionados del
        Motor, que es el único sitio con aprobación, segregación de funciones y
        auditoría encadenada.
      </p>
      <p className="mt-2 text-sm leading-6 text-atlas-muted">
        El ruleset local que se lista abajo sigue existiendo a propósito: es la{" "}
        <strong>degradación</strong> que evita bloquear altas si el Motor no
        responde. Se lee aquí para saber a qué se caería; no se edita aquí.
      </p>
      {enlace ? (
        <a
          href={enlace}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-atlas-border bg-white px-3 py-1.5 text-sm text-atlas-text hover:bg-atlas-soft"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Abrir el gobierno de riesgo en el Motor
        </a>
      ) : (
        <p className="mt-3 text-xs text-atlas-muted">
          Para enlazar al Motor hace falta configurar
          <span className="font-mono"> NEXT_PUBLIC_DECISION_ENGINE_URL</span>.
        </p>
      )}
    </section>
  );
}
