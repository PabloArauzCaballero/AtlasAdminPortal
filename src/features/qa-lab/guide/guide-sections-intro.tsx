"use client";

import { FlaskConical, Gauge, KeyRound, Radar, Workflow } from "lucide-react";
import { FeatureCard, Note, Section } from "./guide-primitives";
import { ScenarioTable, TargetsTable } from "./guide-tables";

export function Panorama() {
  return (
    <Section
      id="panorama"
      num="00"
      kicker="Panorama"
      title="Un laboratorio, tres formas de probar"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        El laboratorio QA se organiza en dos pestañas.{" "}
        <strong>Prueba unitaria</strong> toma una operación del catálogo y
        ofrece dos tarjetas complementarias sobre ella;{" "}
        <strong>Recorrido (encadenado)</strong> ejecuta una secuencia de
        operaciones simulando un flujo de negocio real.
      </p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <FeatureCard
          icon={<FlaskConical className="h-5 w-5" />}
          title="Prueba funcional"
        >
          ¿La operación responde lo correcto? Una petición, con sus datos y
          criterios de salida (código de respuesta, datos esperados, cabeceras).
        </FeatureCard>
        <FeatureCard
          icon={<Gauge className="h-5 w-5" />}
          title="Prueba de carga"
          iconClass="bg-emerald-50 text-emerald-700"
        >
          ¿Aguanta carga? Una ráfaga de peticiones a ritmo fijo por segundo, con
          tiempos típicos y peores, y umbrales de aprobación.
        </FeatureCard>
        <FeatureCard
          icon={<Workflow className="h-5 w-5" />}
          title="Recorrido encadenado"
          iconClass="bg-amber-50 text-amber-700"
        >
          ¿Funciona el flujo completo? Varias operaciones en orden, pasando
          datos de una respuesta a la siguiente.
        </FeatureCard>
      </div>
      <Note tone="tip" tag="Modelo mental">
        <strong>Funcional</strong> = ¿está bien un ladrillo? ·{" "}
        <strong>Carga</strong> = ¿ese ladrillo aguanta peso? ·{" "}
        <strong>Recorrido</strong> = ¿la pared completa se sostiene? Empieza
        siempre por la funcional en el ambiente local antes de subir la
        intensidad.
      </Note>
    </Section>
  );
}

export function Antes() {
  return (
    <Section
      id="antes"
      num="01"
      kicker="Antes de empezar"
      title="Ambiente, permisos y el reflejo de la simulación"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Tres decisiones preceden a cualquier ejecución:{" "}
        <strong>contra qué ambiente</strong> disparas,{" "}
        <strong>qué permiso</strong> tienes, y si estás en{" "}
        <strong>previsualización</strong> o vas en serio.
      </p>

      <TargetsTable />
      <p className="text-sm text-atlas-muted">
        También puedes fijar una <strong>dirección manual</strong> (tiene que
        empezar por http:// o https://) o elegir una ruta base distinta a la del
        ambiente.
      </p>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <FeatureCard
          icon={<Radar className="h-5 w-5" />}
          title="Ver operaciones"
        >
          Entrar al lab y ver el catálogo. Sin él, la página ni siquiera dispara
          consultas.
        </FeatureCard>
        <FeatureCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Ejecutar operaciones"
        >
          Habilita el botón de la prueba funcional.
        </FeatureCard>
        <FeatureCard
          icon={<Gauge className="h-5 w-5" />}
          title="Ejecutar pruebas de carga"
        >
          Habilita la tarjeta de prueba de carga.
        </FeatureCard>
      </div>

      <Note tone="warning" tag="Reflejo">
        El botón nace en <strong>simulación</strong>. En previsualización el
        laboratorio arma la petición exacta —dirección, cabeceras y datos— y te
        la muestra <strong>sin enviarla</strong>. Es tu red de seguridad: revisa
        la petición antes de desmarcar &ldquo;Simulación / modo seguro&rdquo;.
      </Note>
    </Section>
  );
}

export function Escenarios() {
  return (
    <Section
      id="escenarios"
      num="02"
      kicker="Escenarios y cabeceras"
      title="Las cabeceras las gestiona el laboratorio por ti"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        No editas a mano la credencial de la sesión ni la empresa: eliges un{" "}
        <strong>escenario</strong> y el laboratorio aplica las cabeceras
        correctas. Sirve para probar el camino feliz y, sobre todo, los caminos
        de rechazo. La tabla enseña, por escenario, qué cabecera se cambia y qué
        se espera.
      </p>
      <ScenarioTable />

      <h3 className="pt-2 text-base font-semibold text-atlas-text">
        El contrato de respuesta
      </h3>
      <p className="text-sm text-atlas-muted">
        Toda operación responde de una de dos formas, y el laboratorio lo
        comprueba: o trae los <strong>datos</strong> pedidos, o trae un{" "}
        <strong>error</strong> con su código y su mensaje. Las dos llevan el
        código de la petición y la hora.
      </p>
    </Section>
  );
}
