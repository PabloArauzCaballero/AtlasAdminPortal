import { Button } from "@/shared/components/ui/button";
import type { FlowReviewDecision, FlowReviewItem } from "./types";

export function BulkReviewToolbar({
  puedeRevisar,
  seleccion,
  seleccionEnPagina,
  masivo,
  onDecidir,
  onLimpiar,
}: {
  puedeRevisar: boolean;
  seleccion: Map<string, FlowReviewItem>;
  seleccionEnPagina: number;
  masivo: {
    enCurso: boolean;
    resultado: { ok: number; fallidos: FlowReviewItem[] } | null;
  };
  onDecidir: (reviewStatus: FlowReviewDecision["reviewStatus"]) => void;
  onLimpiar: () => void;
}) {
  return (
    <>
      {seleccion.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-atlas-border bg-atlas-surface p-3">
          <span className="text-sm">
            {seleccion.size} seleccionado{seleccion.size === 1 ? "" : "s"}
            {seleccionEnPagina < seleccion.size
              ? ` (${seleccionEnPagina} en esta página)`
              : ""}
          </span>
          <Button
            className="h-8 px-3 text-xs"
            disabled={!puedeRevisar || masivo.enCurso}
            onClick={() => onDecidir("APPROVED")}
          >
            Aprobar seleccionados
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            variant="danger"
            disabled={!puedeRevisar || masivo.enCurso}
            onClick={() => onDecidir("REJECTED")}
          >
            Rechazar seleccionados
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            disabled={masivo.enCurso}
            onClick={onLimpiar}
          >
            Limpiar selección
          </Button>
          {masivo.enCurso ? (
            <span className="text-xs text-atlas-muted">Aplicando…</span>
          ) : null}
        </div>
      ) : null}
      {masivo.resultado ? (
        <p className="mb-4 text-xs text-atlas-muted">
          {masivo.resultado.ok} decisión{masivo.resultado.ok === 1 ? "" : "es"}{" "}
          aplicada{masivo.resultado.ok === 1 ? "" : "s"}.
          {masivo.resultado.fallidos.length
            ? ` ${masivo.resultado.fallidos.length} quedaron marcados y sin aplicar (su código puede haber cambiado entre que se abrió la cola y se decidió) — siguen seleccionados, reintentá.`
            : ""}
        </p>
      ) : null}
    </>
  );
}
