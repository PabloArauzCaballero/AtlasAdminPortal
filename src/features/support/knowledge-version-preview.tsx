"use client";

import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import { useKnowledgeVersion } from "./knowledge-hooks";
import { knowledgeErrorMessage } from "./knowledge-services";
import { ESTADO_VERSION } from "./knowledge-types";

/**
 * El texto completo de la versión, tal como quedará publicado.
 *
 * Se enseña ANTES de cualquier transición, y sobre todo antes de aprobar: aprobar lo que no se leyó
 * convierte la revisión de dos personas en un trámite. El texto va como se escribió (Markdown sin
 * interpretar) para que quien aprueba vea exactamente lo que se guardó.
 */
export function KnowledgeVersionPreview({
  versionId,
}: Readonly<{ versionId: string }>) {
  const version = useKnowledgeVersion(versionId);

  if (version.isLoading) return <LoadingSkeleton rows={5} />;
  if (version.error)
    return (
      <ErrorState
        title="No se pudo leer la versión."
        description={knowledgeErrorMessage(version.error)}
        onRetry={() => void version.refetch()}
      />
    );
  if (!version.data) return null;
  const v = version.data;
  const estado = ESTADO_VERSION[v.status];

  return (
    <article className="space-y-3 rounded-xl border border-atlas-border bg-atlas-soft/40 p-4 text-sm">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-atlas-text">{v.title}</h3>
          {estado ? <Badge tone={estado.tone}>{estado.label}</Badge> : null}
        </div>
        <p className="text-xs text-atlas-muted">
          Versión {v.versionNumber} · {v.locale} · redactada por el usuario #
          {v.createdByInternalUserId ?? "—"} · último cambio{" "}
          {formatDateTime(v.updatedAt)}
        </p>
      </header>
      <Bloque titulo="Motivo del cambio" texto={v.changeReason} />
      <Bloque titulo="Pregunta" texto={v.question} />
      <Bloque titulo="Respuesta corta" texto={v.shortAnswer} />
      <Bloque titulo="Texto completo" texto={v.bodyMarkdown} largo />
      <Bloque titulo="Cuándo escalar" texto={v.escalateWhen} />
    </article>
  );
}

function Bloque({
  titulo,
  texto,
  largo,
}: Readonly<{ titulo: string; texto: string | null; largo?: boolean }>) {
  if (!texto) return null;
  return (
    <section>
      <h4 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-atlas-muted">
        {titulo}
      </h4>
      <p
        className={
          largo
            ? "atlas-scrollbar mt-1 max-h-72 overflow-auto whitespace-pre-wrap text-atlas-text"
            : "mt-1 whitespace-pre-wrap text-atlas-text"
        }
      >
        {texto}
      </p>
    </section>
  );
}
