"use client";

import { Note, Section, StepList } from "./guide-primitives";
import { GuideStressChart } from "./guide-stress-chart";

export function Funcional() {
  return (
    <Section
      id="funcional"
      num="03"
      kicker="Prueba funcional"
      title="¿El endpoint responde lo que promete?"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Tarjeta <strong>&ldquo;2. Prueba funcional del endpoint&rdquo;</strong>.
        Un solo disparo: configuras el request, defines qué esperas de vuelta y
        el lab compara.
      </p>
      <StepList
        items={[
          {
            title: "Elige el endpoint",
            body: (
              <>
                Usa el buscador. Al seleccionarlo se autocompletan payload,
                headers, query y path params desde el esquema del catálogo, y se
                pintan sus badges: método, riesgo, si es{" "}
                <strong>destructivo</strong> o contiene <strong>PII</strong>.
              </>
            ),
          },
          {
            title: "Ajusta el request y aplica un preset",
            body: (
              <>
                Si el endpoint tiene un <strong>payload de ejemplo</strong>,
                aparece el botón &ldquo;Usar payload de ejemplo&rdquo;. Retoca
                el JSON de entrada, headers, query y path params a gusto.
              </>
            ),
          },
          {
            title: "Declara los criterios de salida",
            body: (
              <>
                Aquí está el valor real: <strong>status esperado</strong>,{" "}
                <strong>JSON esperado en respuesta</strong> (subconjunto),{" "}
                <strong>headers esperados</strong>, latencia máxima. El lab
                convierte cada criterio en un <em>check</em> y reporta{" "}
                <code className="font-mono text-atlas-accent">checks 4/4</code>.
              </>
            ),
          },
          {
            title: "Previsualiza, luego ejecuta",
            body: (
              <>
                Con dry-run ves el request armado. Al destildarlo el botón pasa
                a &ldquo;Ejecutar request real&rdquo;; endpoints mutantes o
                destructivos fuera de <code>LOCAL</code> piden teclear{" "}
                <code className="font-mono text-atlas-accent">EJECUTAR</code>.
              </>
            ),
          },
          {
            title: "Lee el resultado",
            body: (
              <>
                Un resumen con{" "}
                <code className="font-mono">OK/ERROR/DRY_RUN</code>, HTTP
                status, latencia y el marcador de checks; debajo, la lista de
                aserciones (esperado / real) y el JSON completo. Descargable
                como <strong>log Pino</strong> con tokens y cookies
                enmascarados.
              </>
            ),
          },
        ]}
      />
    </Section>
  );
}

export function Stress() {
  return (
    <Section
      id="stress"
      num="04"
      kicker="Prueba de stress"
      title="¿Aguanta la carga — y a qué precio en latencia?"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Tarjeta <strong>&ldquo;3. Prueba de stress por endpoint&rdquo;</strong>.
        Lanza una ráfaga de peticiones con pacing por RPS y rampa de subida, y
        mide percentiles. Producción queda bloqueada; el techo duro es de{" "}
        <strong>10.000</strong> requests.
      </p>

      <h3 className="text-base font-semibold text-atlas-text">
        Los diales de carga
      </h3>
      <div className="atlas-table-scroll rounded-xl border border-atlas-border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-atlas-soft text-left font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-atlas-muted">
              <th className="px-4 py-2.5">Dial</th>
              <th className="px-4 py-2.5">Qué controla</th>
              <th className="px-4 py-2.5">Rango</th>
            </tr>
          </thead>
          <tbody>
            <DialRow
              name="RPS objetivo"
              ctrl="Requests por segundo que se intentan sostener."
              range="1 – 500"
            />
            <DialRow
              name="Concurrencia"
              ctrl="Requests en vuelo simultáneas."
              range="1 – 200"
            />
            <DialRow
              name="Duración"
              ctrl="Tiempo total planeado de la corrida."
              range="1 – 3600 s"
            />
            <DialRow
              name="Ramp-up"
              ctrl="Sube el RPS gradualmente en vez de arrancar a full."
              range="0 – duración"
            />
            <DialRow
              name="Max requests"
              ctrl="Techo duro. Si RPS × duración lo supera, la corrida se recorta aquí."
              range="1 – 10.000"
            />
          </tbody>
        </table>
      </div>

      <h3 className="text-base font-semibold text-atlas-text">
        Umbrales de aprobación
      </h3>
      <p className="text-sm text-atlas-muted">
        Cada umbral que pongas en &gt; 0 se evalúa como <em>threshold</em> (pasa
        / revisar): <strong>max error %</strong>,{" "}
        <strong>min throughput RPS</strong>, <strong>max avg</strong>,{" "}
        <strong>max p95</strong>, <strong>max p99</strong> (ms). Así una corrida
        &ldquo;verde&rdquo; lo es contra criterios que tú fijaste, no a ojo.
      </p>

      <h3 className="text-base font-semibold text-atlas-text">
        Lee el gráfico — simúlalo aquí
      </h3>
      <p className="text-sm text-atlas-muted">
        Tras la corrida, el lab dibuja latencia y hits{" "}
        <strong>por segundo</strong> sobre el mismo eje de tiempo. Pulsa{" "}
        <strong>Simular corrida</strong> para verlo avanzar segundo a segundo,
        tal como aparece en la herramienta.
      </p>
      <GuideStressChart />

      <Note tone="tip" tag="Cómo leerlo">
        La <strong>línea sólida (p95)</strong> es tu peor caso típico: si sube
        con los hits, el endpoint se degrada bajo carga. La{" "}
        <strong>brecha</strong> entre p95 y el promedio punteado mide la cola de
        lentos. Un <strong>punto rojo</strong> marca el segundo exacto donde
        empezaron los errores — normalmente el momento en que se saturó.
      </Note>
      <Note tone="warning" tag="Hoy no hay">
        El gráfico es de <strong>una</strong> corrida y se dibuja al terminar.
        No existe (todavía) una tendencia que compare{" "}
        <strong>totales entre corridas pasadas</strong> ni una barra de progreso{" "}
        <strong>en vivo mientras corre</strong>. Para comparar históricos hoy
        usas la lista de <strong>Carga QA</strong> (§07), corrida por corrida.
      </Note>
    </Section>
  );
}

function DialRow({
  name,
  ctrl,
  range,
}: Readonly<{ name: string; ctrl: string; range: string }>) {
  return (
    <tr className="border-t border-atlas-border align-top">
      <td className="px-4 py-3">
        <code className="font-mono text-atlas-accent">{name}</code>
      </td>
      <td className="px-4 py-3 text-atlas-text">{ctrl}</td>
      <td className="px-4 py-3 font-mono text-xs text-atlas-muted">{range}</td>
    </tr>
  );
}
