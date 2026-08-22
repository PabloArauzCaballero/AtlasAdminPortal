"use client";

import { RoleGate } from "@/shared/auth/role-gate";
import { RUNTIME_JOB_ROLE_LIST } from "@/shared/auth/portal-roles";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { RuntimeJobCard } from "./runtime-job-card";
import { RUNTIME_JOBS } from "./runtime-job-catalog";
import { PlayCircle } from "lucide-react";

export function RuntimeJobsPage() {
  return (
    <RoleGate roles={RUNTIME_JOB_ROLE_LIST}>
      <PageHeader
        icon={PlayCircle}
        eyebrow="Operaciones"
        title="Jobs de runtime"
        description="Ejecución manual de los procesos de mantenimiento del backend: cola de outbox, eventos pendientes, expiración de sesiones, retención y recálculo de calidad."
      />
      <BusinessContextNote>
        Todos los jobs arrancan en <strong>ensayo (dry-run)</strong> a
        propósito: reportan lo que harían sin escribir nada. La ejecución real
        exige confirmación explícita y, en los jobs que borran o anonimizan,
        teclear el código del job. El backend los restringe además a los roles{" "}
        <span className="font-mono">admin</span>,{" "}
        <span className="font-mono">platform_admin</span> y{" "}
        <span className="font-mono">system</span>. Cada ejecución queda
        registrada con su <span className="font-mono">jobRunId</span> en el
        historial de ejecuciones.
      </BusinessContextNote>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {RUNTIME_JOBS.map((definition) => (
          <RuntimeJobCard key={definition.code} definition={definition} />
        ))}
      </div>
    </RoleGate>
  );
}
