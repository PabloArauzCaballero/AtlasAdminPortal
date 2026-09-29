"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MailCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionTable } from "@/shared/components/data-table/section-table";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { useResendContactVerificationMutation } from "./hooks";
import type { InvestigationSummary } from "./types";

type Contacto = InvestigationSummary["contacts"][number];
type Consentimiento = InvestigationSummary["consents"][number];

/**
 * Contactos y consentimientos del cliente en la ficha de investigación.
 *
 * Son cuadros y no listas de tarjetas porque son registros del mismo tipo que se comparan: cuál
 * contacto es el primario, cuál sigue sin verificar, qué consentimiento se otorgó y cuál se revocó.
 * Reenviar el código sigue donde estaba, en la fila del contacto sin verificar.
 */
export function ContactosYConsentimientos({
  customerId,
  contactos,
  consentimientos,
}: Readonly<{
  customerId: string;
  contactos: Contacto[];
  consentimientos: Consentimiento[];
}>) {
  const reenvio = useResendContactVerificationMutation();
  const [aviso, setAviso] = useState<string | null>(null);

  const columnasContactos = useMemo<ColumnDef<Contacto>[]>(
    () => [
      {
        header: "Tipo",
        accessorFn: (contacto) => safeText(contacto.contactType),
        cell: ({ row }) => (
          <span>
            {safeText(row.original.contactType)}
            {row.original.isPrimary ? (
              <Badge tone="info" className="ml-2">
                Primario
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        header: "Valor (últimos 4)",
        accessorKey: "valueLast4",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            ···{safeText(row.original.valueLast4)}
          </span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => {
          const contacto = row.original;
          const tipo = contacto.contactType;
          if (
            contacto.status !== "unverified" ||
            (tipo !== "email" && tipo !== "phone")
          ) {
            return null;
          }
          return (
            <Button
              variant="secondary"
              disabled={reenvio.isPending}
              onClick={() =>
                reenvio.mutate(
                  { customerId, body: { contactType: tipo } },
                  {
                    onSuccess: () => setAviso("Código reenviado al cliente."),
                    onError: (error) =>
                      setAviso(
                        `No se pudo reenviar: ${isAtlasApiError(error) ? error.message : "inténtalo en un minuto."}`,
                      ),
                  },
                )
              }
            >
              <MailCheck className="h-3.5 w-3.5" />
              Reenviar código
            </Button>
          );
        },
      },
    ],
    [customerId, reenvio],
  );

  return (
    <section className="grid gap-4 grid-cols-1 xl:grid-cols-2">
      <div className="space-y-2">
        <SectionTable
          title="Contactos"
          data={contactos}
          columns={columnasContactos}
          searchText={(c) =>
            `${c.contactType ?? ""} ${c.valueLast4 ?? ""} ${c.status ?? ""}`
          }
          searchPlaceholder="Buscar por tipo, terminación o estado…"
          searchTooltip="Recorre todos los contactos del cliente: coincide con parte del tipo, de los últimos 4 dígitos o del estado."
          emptyTitle="Sin contactos registrados."
          emptyDescription="El cliente todavía no dio ningún teléfono ni correo."
        />
        {aviso ? (
          <p className="text-xs text-atlas-muted" role="status">
            {aviso}
          </p>
        ) : null}
      </div>
      <SectionTable
        title="Consentimientos"
        data={consentimientos}
        columns={COLUMNAS_CONSENTIMIENTOS}
        searchText={(c) => `${c.purposeCode ?? ""}`}
        searchPlaceholder="Buscar por finalidad…"
        searchTooltip="Recorre todos los consentimientos del cliente: coincide con parte del código de la finalidad."
        emptyTitle="Sin consentimientos registrados."
        emptyDescription="El cliente todavía no aceptó ni rechazó ninguna finalidad."
      />
    </section>
  );
}

const COLUMNAS_CONSENTIMIENTOS: ColumnDef<Consentimiento>[] = [
  {
    header: "Finalidad",
    accessorKey: "purposeCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {safeText(row.original.purposeCode)}
      </span>
    ),
  },
  {
    header: "Estado",
    accessorFn: (c) => (c.granted ? "Otorgado" : "No otorgado"),
    cell: ({ row }) => (
      <Badge tone={row.original.granted ? "success" : "muted"}>
        {row.original.granted ? "Otorgado" : "No otorgado"}
      </Badge>
    ),
  },
  {
    header: "Otorgado",
    accessorKey: "grantedAt",
    cell: ({ row }) => formatDateTime(row.original.grantedAt),
  },
  {
    header: "Revocado",
    accessorKey: "revokedAt",
    cell: ({ row }) => formatDateTime(row.original.revokedAt),
  },
];
