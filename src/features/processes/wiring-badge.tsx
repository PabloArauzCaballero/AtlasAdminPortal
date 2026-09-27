import { Badge } from "@/shared/components/ui/badges";
import { WIRING } from "./labels";
import type { StepWiring } from "./types";

/** El estado de cableado de un paso, con su explicación al pasar el cursor. */
export function WiringBadge({ value }: Readonly<{ value: StepWiring }>) {
  const wiring = WIRING[value];
  return (
    <span title={wiring.hint}>
      <Badge tone={wiring.tone} dot>
        {wiring.label}
      </Badge>
    </span>
  );
}
