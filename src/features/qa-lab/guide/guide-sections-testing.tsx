"use client";

import { Note, Section, StepList } from "./guide-primitives";
import { GuideStressChart } from "./guide-stress-chart";
import { DialsTable } from "./guide-tables";

export function Funcional() {
  return (
    <Section
      id="funcional"
      num="03"
      kicker="Prueba funcional"
      title="¿El endpoint responde lo que promete?"
    >
      <p className="max-w-3xl text-[0.9375rem] leading-7 text-atlas-muted">
        Pestaña <strong>&ldquo;Funcional&rdquo;</strong> de la prueba unitaria.
        Un solo disparo desde tu navegador: configuras la petición, defines qué
        esperas de vuelta y el lab compara. No se guarda en ningún historial.
      </p>
      <StepList
        items={[
          {
            title: "Elige el endpoint",
            body: (
              <>
                Usa el buscador. Al elegirla, los datos de entrada se rellenan
                con el primer caso válido del generador de datos (semilla
                elegida) según los campos obligatorios del catálogo, y se pintan
                sus avisos: método, riesgo, si es <strong>destructiva</strong> o
                lleva <strong>datos personales</strong>.
              </>
            ),
          },
          {
            title: "Genera datos o usa el ejemplo",
            body: (
              <>
                &ldquo;Generar datos de prueba&rdquo; crea casos válidos, en el
                límite o inválidos con personas del generador (semilla con
                nombre = mismas personas; &ldquo;Personas nuevas&rdquo; = lote
                nuevo). Si la operación tiene ejemplo, aparece &ldquo;Usar el
                ejemplo: …&rdquo;, que se rellena con los mismos datos. Si el
                generador no responde, el lab lo dice y no inventa nada.
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
                Con &ldquo;Sólo previsualizar&rdquo; ves la petición armada. Al
                desmarcarlo el botón pasa a &ldquo;Enviar petición real&rdquo;;
                un cambio real fuera de <code>LOCAL</code> pide teclear{" "}
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
        Pestaña <strong>&ldquo;Carga&rdquo;</strong> de la prueba unitaria.
        Lanza desde tu navegador una ráfaga de peticiones a un ritmo fijo, con
        subida gradual, y mide percentiles. Producción queda bloqueada; el techo
        duro es de <strong>10.000</strong> peticiones. Con &ldquo;Datos
        distintos por petición&rdquo; cada una lleva una persona distinta del
        generador.
      </p>

      <h3 className="text-base font-semibold text-atlas-text">
        Los diales de carga
      </h3>
      <DialsTable />

      <h3 className="text-base font-semibold text-atlas-text">
        Umbrales de aprobación
      </h3>
      <p className="text-sm text-atlas-muted">
        Cada umbral que pongas en &gt; 0 se evalúa (pasa / revisar):{" "}
        <strong>errores tolerados</strong>, <strong>rendimiento mínimo</strong>,{" "}
        <strong>tiempo medio máximo</strong> y los topes del{" "}
        <strong>p95</strong> y <strong>p99</strong> (el tiempo por debajo del
        cual queda el 95 % o el 99 % de las peticiones). Así una corrida
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
        <strong>en vivo mientras corre</strong>, y la corrida no se guarda:
        descarga el registro si necesitas compararla después.
      </Note>
    </Section>
  );
}
