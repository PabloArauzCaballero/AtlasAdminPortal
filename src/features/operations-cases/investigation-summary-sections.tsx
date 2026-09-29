"use client";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { SeverityBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionTable } from "@/shared/components/data-table/section-table";
import type { getInvestigationSummary } from "./services";
import {
  caseTypeLabel,
  engineSuggestionText,
  identityChannelLabel,
  identityResultLabel,
} from "./identity-review-rules";

type Resumen = Awaited<ReturnType<typeof getInvestigationSummary>>;

/**
 * Las dos secciones de la página de investigación que sólo PINTAN datos del resumen: la verificación
 * de identidad con la forma de la agenda, y los casos abiertos. Viven aparte porque la página
 * superaba las 300 líneas del gate al sumar el panel de evidencia y el reenvío de códigos; separar lo
 * que sólo lee de lo que actúa deja la página con las acciones y estas con la lectura.
 */
export function IdentidadYAgendaSection({ data }: Readonly<{ data: Resumen }>) {
  return (
    <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <KeyValueSection
        title="Verificación de identidad"
        items={
          data.latestIdentityVerification
            ? [
                {
                  label: "Resultado",
                  value: identityResultLabel(
                    data.latestIdentityVerification.result,
                  ),
                },
                ...sugerencia(data.latestIdentityVerification),
                {
                  label: "Canal",
                  value: identityChannelLabel(
                    data.latestIdentityVerification.channel,
                  ),
                },
                {
                  label: "Parecido biométrico",
                  value: formatNumber(
                    data.latestIdentityVerification.similarity,
                  ),
                },
                {
                  // Riesgo de FALSIFICACIÓN del documento, no confianza en la lectura. Se
                  // nombra entero porque los dos números viven al lado y se confunden.
                  label: "Riesgo de fraude documental",
                  value: formatNumber(
                    data.latestIdentityVerification.fraudRisk,
                  ),
                },
                {
                  label: "Solicitada",
                  value: formatDateTime(
                    data.latestIdentityVerification.requestedAt,
                  ),
                },
                {
                  label: "Resuelta",
                  value: formatDateTime(
                    data.latestIdentityVerification.completedAt,
                  ),
                },
              ]
            : [
                {
                  label: "Resultado",
                  value: "Sin verificaciones de identidad registradas",
                },
              ]
        }
      />
      <KeyValueSection
        title="Agenda del dispositivo"
        items={
          data.addressBook.available
            ? [
                {
                  label: "Contactos",
                  value: formatNumber(data.addressBook.totalContacts),
                },
                {
                  label: "Números distintos",
                  value: formatNumber(data.addressBook.uniqueRatio),
                },
                {
                  label: "Números bolivianos",
                  value: formatNumber(data.addressBook.bolivianRatio),
                },
                {
                  label: "Referencias dentro de la agenda",
                  value: formatNumber(
                    data.addressBook.referencesFoundInAddressBook,
                  ),
                },
                {
                  label: "Coincidencias con teléfonos ya marcados",
                  value: formatNumber(data.addressBook.riskMatches),
                },
              ]
            : [
                {
                  /*
                              «No compartida» y no «vacía», y la diferencia importa: negarse a dar el
                              permiso es un derecho, no una señal de fraude. Enseñarlo como una agenda
                              de cero contactos invitaría a leer una decisión legítima como sospechosa.
                            */
                  label: "Estado",
                  value:
                    "No compartida — la persona no dio el permiso, o el alta es anterior a esta señal",
                },
              ]
        }
      />
    </section>
  );
}

export function CasosAbiertosSection({ data }: Readonly<{ data: Resumen }>) {
  return (
    <section className="grid gap-4 grid-cols-1 xl:grid-cols-2">
      <SectionTable
        title="Casos de revisión manual"
        data={data.manualReviewCases}
        columns={REVISION_MANUAL_COLUMNS}
        searchText={(item) =>
          `${item.caseId} ${item.caseCode ?? ""} ${caseTypeLabel(item.caseType)} ${item.priority ?? ""}`
        }
        searchPlaceholder="Buscar por número, código, tipo o prioridad…"
        searchTooltip="Recorre todos los casos de revisión manual abiertos de este cliente: coincide con parte del número, del código, del tipo o de la prioridad."
        emptyTitle="Sin casos de revisión manual abiertos."
        emptyDescription="Cuando el Motor mande una decisión de este cliente a revisión humana, el caso aparecerá aquí."
      />
      <SectionTable
        title="Casos de fraude"
        data={data.fraudCases}
        columns={FRAUDE_COLUMNS}
        searchText={(item) =>
          `${item.caseId} ${item.caseCode ?? ""} ${item.severity ?? ""} ${item.caseStatus ?? ""}`
        }
        searchPlaceholder="Buscar por número, código, gravedad o estado…"
        searchTooltip="Recorre todos los casos de fraude abiertos de este cliente: coincide con parte del número, del código, de la gravedad o del estado."
        emptyTitle="Sin casos de fraude abiertos."
        emptyDescription="Cuando se abra un caso de fraude de este cliente aparecerá aquí."
      />
    </section>
  );
}

type CasoRevision = Resumen["manualReviewCases"][number];
type CasoFraude = Resumen["fraudCases"][number];

const REVISION_MANUAL_COLUMNS: ColumnDef<CasoRevision>[] = [
  {
    header: "Caso",
    accessorKey: "caseId",
    cell: ({ row }) => (
      <span className="font-mono text-xs">#{row.original.caseId}</span>
    ),
  },
  {
    header: "Código",
    accessorKey: "caseCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {safeText(row.original.caseCode)}
      </span>
    ),
  },
  {
    header: "Tipo",
    accessorFn: (item) => caseTypeLabel(item.caseType),
  },
  {
    header: "Prioridad",
    accessorFn: (item) => safeText(item.priority),
  },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    header: "Abierto",
    accessorKey: "openedAt",
    cell: ({ row }) => formatDateTime(row.original.openedAt),
  },
];

const FRAUDE_COLUMNS: ColumnDef<CasoFraude>[] = [
  {
    header: "Caso",
    accessorKey: "caseId",
    cell: ({ row }) => (
      <span className="font-mono text-xs">#{row.original.caseId}</span>
    ),
  },
  {
    header: "Código",
    accessorKey: "caseCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {safeText(row.original.caseCode)}
      </span>
    ),
  },
  {
    header: "Gravedad",
    accessorKey: "severity",
    cell: ({ row }) => <SeverityBadge value={row.original.severity} />,
  },
  {
    header: "Estado",
    accessorKey: "caseStatus",
    cell: ({ row }) => <StatusBadge value={row.original.caseStatus} />,
  },
  {
    header: "Abierto",
    accessorKey: "openedAt",
    cell: ({ row }) => formatDateTime(row.original.openedAt),
  },
];

function sugerencia(
  identidad: NonNullable<Resumen["latestIdentityVerification"]>,
): { label: string; value: string }[] {
  const texto = engineSuggestionText(
    identidad.engineSuggestion,
    identidad.engineReason,
  );
  return texto ? [{ label: "Sugerencia del Motor", value: texto }] : [];
}
