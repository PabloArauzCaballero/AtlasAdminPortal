import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badges";
import { stageHref } from "./labels";
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
