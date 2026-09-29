import { ExternalLink, MonitorSmartphone, UserRound } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { actorLabel, clientLabel, stageHref } from "./labels";
import { ProcessStepRow } from "./process-step-row";
import type { ProcessStage } from "./types";

const PERSON_ACTORS = new Set([
  "internal_user",
  "merchant_user",
  "platform_user",
]);

/** Dónde actúa la persona de una etapa: enlace si la pantalla es de este portal, texto si no. */
export function StageScreen({
  stage,
  instanceId,
}: Readonly<{
  stage: Pick<ProcessStage, "client" | "actor"> & {
    screen?: string | null;
    link?: string | null;
  };
  instanceId?: string;
}>) {
  const screen = stage.screen ?? stage.link ?? null;
  const href = stageHref(stage.client, screen, instanceId);
  if (href)
    return (
      <Link
        className="inline-flex items-center gap-1 text-atlas-accent underline"
        href={href}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Abrir la pantalla
      </Link>
    );
  if (screen)
    return <span className="break-all font-mono text-xs">{screen}</span>;
  if (PERSON_ACTORS.has(stage.actor) && stage.client !== "CONSUMER_APP")
    return <Badge tone="critical">Sin pantalla declarada</Badge>;
  return <span className="text-atlas-muted">—</span>;
}

/** Las etapas en su orden, cada una con quién actúa, desde dónde y sus pasos. */
export function ProcessStages({
  stages,
  onOpenFlow,
}: Readonly<{
  stages: ProcessStage[];
  onOpenFlow?: (flowId: string) => void;
}>) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <SectionHeader
          title="Etapas y pasos"
          description="En el orden en que ocurren. Los pasos en rojo los debería hacer una persona desde su portal, y ninguna pantalla lo permite todavía."
        />
      </CardHeader>
      <CardContent>
        <ol className="space-y-6">
          {stages.map((stage, index) => (
            <li key={stage.code} data-testid={`etapa-${stage.code}`}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-atlas-accentSoft text-sm font-semibold text-atlas-accent">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-atlas-text">
                    {stage.name}
                    {stage.optional ? (
                      <span className="ml-2 text-xs font-normal text-atlas-muted">
                        (opcional)
                      </span>
                    ) : null}
                  </h3>
                  <p className="mt-0.5 text-sm leading-6 text-atlas-muted">
                    {stage.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <UserRound
                        className="h-4 w-4 text-atlas-muted"
                        aria-hidden
                      />
                      {actorLabel(stage.actor)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MonitorSmartphone
                        className="h-4 w-4 text-atlas-muted"
                        aria-hidden
                      />
                      {clientLabel(stage.client)}
                    </span>
                    <StageScreen stage={stage} />
                  </div>
                  {stage.steps.length ? (
                    <ul className="mt-3 space-y-2">
                      {stage.steps.map((step) => (
                        <ProcessStepRow
                          key={step.code}
                          step={step}
                          onOpenFlow={onOpenFlow}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-atlas-muted">
                      Esta etapa no declara pasos.
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
