import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { isAtlasApiError } from "@/shared/api/errors";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useInstanceProgress } from "./hooks";
import { actorLabel, clientLabel, STAGE_STATE } from "./labels";
import { StageScreen } from "./stage-screen";

/**
 * Dónde va un caso: cada etapa del proceso marcada como superada, actual o sin dato.
 *
 * «Sin dato» no es «pendiente»: el backend compara el estado del caso con los estados de entrada
 * y de salida de cada etapa, y una etapa que no declara ninguno no se puede situar. Decir
 * «pendiente» sería inventar.
 */
export function InstanceProgress({
  code,
  instanceId,
}: Readonly<{ code: string; instanceId: string }>) {
  const progress = useInstanceProgress(code, instanceId);
  return (
    <Card testId="avance-del-caso">
      <CardHeader>
        <SectionHeader
          title="Avance del caso"
          description="En qué etapa está, según su estado actual."
        />
      </CardHeader>
      <CardContent>
        {progress.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {progress.error ? (
          <ErrorState
            title="No se pudo cargar el avance de este caso."
            description={
              isAtlasApiError(progress.error)
                ? progress.error.message
                : "Revisa la conexión y vuelve a intentarlo."
            }
            onRetry={() => void progress.refetch()}
          />
        ) : null}
        {progress.data ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-atlas-text">
                {progress.data.instance.label ?? progress.data.instance.id}
              </span>
              <StatusBadge value={progress.data.instance.status} />
            </div>
            <ol className="space-y-3">
              {progress.data.stages.map((stage, index) => {
                const state = STAGE_STATE[stage.state];
                return (
                  <li
                    key={stage.code}
                    className={
                      stage.state === "current"
                        ? "rounded-xl border border-atlas-accent/40 bg-atlas-accentSoft p-3"
                        : "rounded-xl border border-atlas-border bg-white p-3"
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-atlas-text">
                        {`${index + 1}. ${stage.name}`}
                      </p>
                      <Badge tone={state.tone} dot>
                        {state.label}
                      </Badge>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-atlas-muted">
                      <span>{actorLabel(stage.actor)}</span>
                      <span>{clientLabel(stage.client)}</span>
                      <StageScreen stage={stage} instanceId={instanceId} />
                    </p>
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
