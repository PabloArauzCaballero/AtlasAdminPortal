"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoleGate } from "@/shared/auth/role-gate";
import { AdminFormsTable } from "@/features/admin-forms/admin-forms-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useSchemaVersions } from "./hooks";
import { ProposeTableForm } from "./propose-table-form";
import { buildSchemaVersionColumns } from "./schema-version-columns";
import { SchemaChangeLogTable } from "./schema-change-log-table";

export function SchemaVersionsPage() {
  const [page, setPage] = useState(1);
  const [proposing, setProposing] = useState(false);
  const versions = useSchemaVersions({ limit: 20, offset: (page - 1) * 20 });
  const columns = useMemo(() => buildSchemaVersionColumns(), []);

  return (
    <>
      <PageHeader
        eyebrow="Operaciones"
        title="Versiones de esquema"
        description="Catálogo DDL de solo-lectura: versiones, tablas, columnas y relaciones registradas. No ejecuta DDL físico — proponer una tabla solo registra un cambio pendiente de aprobación."
        actions={
          <>
            <Link href="/internal/schema/change-log">
              <Button>Change log</Button>
            </Link>
            <Button variant="primary" onClick={() => setProposing(true)}>
              Proponer tabla
            </Button>
          </>
        }
      />
      <BusinessContextNote>
        El DDL real sigue saliendo por migraciones revisadas en PR. Proponer una
        tabla acá solo registra la propuesta en el change log; requiere
        aprobación de un <span className="font-mono">platform_admin</span>{" "}
        distinto de quien la propuso (4 ojos).
      </BusinessContextNote>
      {versions.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {versions.error ? (
        <ErrorState
          description={
            isAtlasApiError(versions.error)
              ? versions.error.message
              : "No se pudieron cargar las versiones de esquema."
          }
          requestId={
            isAtlasApiError(versions.error)
              ? versions.error.requestId
              : undefined
          }
          onRetry={() => void versions.refetch()}
        />
      ) : null}
      {versions.data ? (
        <DataTable
          data={versions.data.items}
          columns={columns}
          meta={versions.data.meta}
          onPageChange={setPage}
          emptyTitle="No hay versiones de esquema registradas."
        />
      ) : null}
      {proposing ? (
        <ProposeTableForm onClose={() => setProposing(false)} />
      ) : null}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-atlas-text">
          Solicitudes de cambio pendientes
        </h2>
        <p className="mb-3 mt-1 text-sm text-atlas-muted">
          Propuestas de cambio de esquema a la espera de aprobación de 4 ojos.{" "}
          <Link
            className="font-medium text-blue-700 underline"
            href="/internal/schema/change-log"
          >
            Ver historial completo
          </Link>
          .
        </p>
        <SchemaChangeLogTable pageSize={10} />
      </div>

      <RoleGate roles={["SUPER_ADMIN"]} fallback={null}>
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-atlas-text">
            Formularios (solo superadmin)
          </h2>
          <p className="mb-3 mt-1 text-sm text-atlas-muted">
            Mapa de formularios operativos de otros módulos, visible únicamente
            para superadmin.
          </p>
          <AdminFormsTable />
        </div>
      </RoleGate>
    </>
  );
}
