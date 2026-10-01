"use client";

import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useSchemaNames } from "./hooks";
import { SchemaPicker } from "./schema-picker";
import type { SchemaVersion } from "./types";

/**
 * Los esquemas de datos de la versión vigente, a un clic de sus tablas.
 *
 * La lista de versiones sólo enseñaba contadores: para llegar a las tablas había que abrir la
 * versión y, dentro, elegir el esquema. Aquí cada esquema es una tarjeta que lleva directo a SUS
 * tablas (`?schema=`), que es como se piensa al buscar: «las tablas de riesgo», no «la versión 1».
 */
export function SchemaVersionsIndex({
  version,
}: Readonly<{ version: SchemaVersion }>) {
  const router = useRouter();
  const schemas = useSchemaNames(version._id);
  if (version.tablesCount === 0) return null;

  return (
    <section className="mb-6" aria-label="Esquemas de datos de la versión">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-atlas-text">
        <Layers className="h-4 w-4 text-atlas-accent" aria-hidden />
        Esquemas de datos ·{" "}
        <span className="font-mono">{version.versionCode}</span>
      </h2>
      <p className="mb-3 text-sm text-atlas-muted">
        Elige un esquema para ver sus tablas, columnas y relaciones.
      </p>
      {schemas.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {schemas.error ? (
        <ErrorState
          description={
            isAtlasApiError(schemas.error)
              ? schemas.error.message
              : "No se pudieron cargar los esquemas de esta versión."
          }
          onRetry={() => void schemas.refetch()}
        />
      ) : null}
      {schemas.data ? (
        <SchemaPicker
          schemas={schemas.data}
          selected={null}
          onSelect={(schemaName) =>
            router.push(
              schemaName
                ? `/internal/schema/versions/${version._id}?schema=${encodeURIComponent(schemaName)}`
                : `/internal/schema/versions/${version._id}`,
            )
          }
        />
      ) : null}
    </section>
  );
}
