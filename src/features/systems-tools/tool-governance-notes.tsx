import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { ToolItem } from "@/features/systems/types/catalog-types";

/**
 * Metadata de gobierno de una herramienta: qué aporta al negocio, cómo la usa el backend, qué mira
 * auditoría y qué se rompe si falla.
 *
 * Vivía en la base de datos sin llegar a ninguna pantalla. Es la parte de la ficha que responde
 * la pregunta que trae a alguien aquí en mitad de un incidente —«si esto está caído, ¿qué deja de
 * funcionar?»—, y tenerla sólo en la tabla equivalía a no tenerla.
 *
 * Cuando la herramienta no trae ninguno de los cinco textos se dice con esas palabras en lugar de
 * dibujar una tarjeta vacía: un hueco explicado es información, un hueco mudo es ruido.
 */
export function ToolGovernanceNotes({ tool }: Readonly<{ tool: ToolItem }>) {
  const sections = [
    { label: "Descripción", value: tool.description },
    { label: "Valor de negocio", value: tool.businessValue },
    { label: "Uso técnico", value: tool.technicalUsage },
    { label: "Notas de auditoría", value: tool.auditNotes },
    { label: "Riesgos ante fallo", value: tool.failureRisks },
  ].filter((section) => Boolean(section.value?.trim()));

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-atlas-muted">
            Esta herramienta no tiene metadata de gobierno registrada. Se
            completa desde el seed del catálogo (`SYSTEM_TOOL_SEEDS` en el
            backend), no desde esta pantalla.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-atlas-text">
          Gobierno de la herramienta
        </h2>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <dt className="text-sm font-semibold text-atlas-text">
                {section.label}
              </dt>
              <dd className="mt-1 text-sm text-atlas-muted">{section.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
