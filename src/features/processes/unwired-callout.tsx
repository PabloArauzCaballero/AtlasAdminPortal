import { Unplug } from "lucide-react";
import { useProcessWiring } from "./hooks";
import { clientLabel } from "./labels";

/**
 * Lo primero que se ve de un proceso con pasos sin pantalla: cuáles son y desde qué portal
 * deberían hacerse. Sale de `…/wiring`, que sólo cuenta pasos de personas en un portal.
 * Si la consulta falla no tapa la ficha: los mismos pasos siguen marcados en rojo más abajo.
 */
export function UnwiredCallout({ code }: Readonly<{ code: string }>) {
  const wiring = useProcessWiring(code);
  const unwired =
    wiring.data?.steps.filter((s) => s.wiring === "unwired") ?? [];
  if (!unwired.length) return null;
  return (
    <section
      role="status"
      className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <Unplug className="h-4 w-4" aria-hidden />
        {unwired.length === 1
          ? "1 paso sin pantalla"
          : `${unwired.length} pasos sin pantalla`}
      </h2>
      <p className="mt-1 text-sm text-red-800">
        Una persona tiene que hacerlos desde su portal y ninguna pantalla lo
        permite todavía.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900">
        {unwired.map((step) => (
          <li key={`${step.stageCode}-${step.stepCode}`}>
            <span className="font-medium">{step.stepName}</span>
            {` — etapa «${step.stageName}», desde ${clientLabel(step.client)}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
