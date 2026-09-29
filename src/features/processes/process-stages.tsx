import { SectionHeader } from "@/shared/components/layout/page-header";
import { ProcessStepsTable } from "./process-steps-table";
import type { ProcessStage } from "./types";

/** Las etapas del proceso en su orden, con sus pasos, quién actúa, desde dónde y si tienen pantalla. */
export function ProcessStages({
  stages,
  onOpenFlow,
}: Readonly<{
  stages: ProcessStage[];
  onOpenFlow?: (flowId: string) => void;
}>) {
  return (
    <section className="mb-6">
      <SectionHeader
        title="Etapas y pasos"
        description="En el orden en que ocurren. Los pasos en rojo los debería hacer una persona desde su portal, y ninguna pantalla lo permite todavía."
      />
      <ProcessStepsTable stages={stages} onOpenFlow={onOpenFlow} />
    </section>
  );
}
