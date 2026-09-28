import { Badge } from "@/shared/components/ui/badges";
import { estadoCaso, prioridad } from "./labels";

/**
 * El estado y la prioridad del caso, en palabras y con su tono.
 *
 * Las insignias compartidas del portal pintan el valor tal como llega: con ellas la bandeja decía
 * «WAITING_CUSTOMER» y la prioridad «P2» salía en gris, igual que «P4». Éstas usan la misma
 * insignia base con la etiqueta y el tono del mapa de soporte.
 */
export function EstadoCasoBadge({
  value,
}: Readonly<{ value?: string | null }>) {
  const { label, tone } = estadoCaso(value);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function PrioridadBadge({ value }: Readonly<{ value?: string | null }>) {
  const { label, tone } = prioridad(value);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
