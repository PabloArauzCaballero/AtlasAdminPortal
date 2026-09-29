import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import { DocChecksTable } from "./doc-checks-table";
import type { ProcessDetail } from "./types";

const short = (hash: string | null) => (hash ? hash.slice(0, 12) : "—");

/**
 * Las cinco comprobaciones de documentación, de dónde sale lo que dice la ficha y si la versión
 * guardada en la base es la misma que declara el código desplegado.
 */
export function ProcessDocumentation({
  process,
}: Readonly<{ process: ProcessDetail }>) {
  const doc = process.documentation;
  const sameVersion =
    process.databaseHash !== null && process.databaseHash === process.codeHash;
  return (
    <div className="mb-6 space-y-6">
      <section>
        <SectionHeader
          title="Documentación"
          description={
            doc.complete
              ? "Cumple las cinco comprobaciones."
              : "Le falta algo para contar como documentado."
          }
        />
        <DocChecksTable documentation={doc} />
      </section>
      <Card>
        <CardHeader>
          <SectionHeader
            title="Versión y fuentes"
            description="De dónde sale lo que dice esta ficha y si la base está al día."
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {sameVersion ? (
              <Badge tone="success" dot>
                La base tiene la versión del código
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                {process.databaseHash
                  ? "La base tiene una versión anterior"
                  : "El proceso aún no está en la base"}
              </Badge>
            )}
            <span className="text-xs text-atlas-muted">
              {`Versión ${process.version}`}
              {doc.syncedAt
                ? ` · guardada el ${formatDateTime(doc.syncedAt)}`
                : ""}
            </span>
          </div>
          <details className="mt-2 text-xs text-atlas-muted">
            <summary className="cursor-pointer select-none">Huellas</summary>
            <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-1 font-mono">
              <dt>Código</dt>
              <dd>{short(process.codeHash)}</dd>
              <dt>Base</dt>
              <dd>{short(process.databaseHash)}</dd>
            </dl>
          </details>
          <p className="mt-4 text-sm font-semibold text-atlas-text">Fuentes</p>
          {process.sources.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-atlas-muted">
              {process.sources.map((source) => (
                <li key={source} className="break-all">
                  {source}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-amber-700">
              Sin fuente: lo que dice la ficha no se puede contrastar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
