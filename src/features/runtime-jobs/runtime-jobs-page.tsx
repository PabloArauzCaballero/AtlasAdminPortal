"use client";

import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { RuntimeJobCard } from "./runtime-job-card";
import { RUNTIME_JOBS } from "./runtime-job-catalog";

/**
 * Pestaña «Ejecutar ahora» de Jobs (antes la pantalla «Jobs de runtime»). El
 * gate por rol lo pone la página contenedora.
 */
export function RuntimeJobsPanel() {
  return (
    <>
      <BusinessContextNote>
        Todos los jobs arrancan en <strong>ensayo (dry-run)</strong> a
        propósito: reportan lo que harían sin escribir nada. La ejecución real
        exige confirmación explícita y, en los jobs que borran o anonimizan,
        teclear el código del job. El backend los restringe además a los roles{" "}
        <span className="font-mono">admin</span>,{" "}
        <span className="font-mono">platform_admin</span> y{" "}
        <span className="font-mono">system</span>. Cada ejecución queda en la
        pestaña «Historial» con su número de corrida.
      </BusinessContextNote>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {RUNTIME_JOBS.map((definition) => (
          <RuntimeJobCard key={definition.code} definition={definition} />
        ))}
      </div>
    </>
  );
}
