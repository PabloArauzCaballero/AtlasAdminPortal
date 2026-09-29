"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SectionTable } from "@/shared/components/data-table/section-table";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { networkStatusLabel, qrKindLabel, qrStatusLabel } from "./labels";
import { PartnerStatusBadge } from "./partner-status-badge";

type Fila = Record<string, unknown>;

function filas(valor: unknown): Fila[] {
  return Array.isArray(valor)
    ? valor.filter((fila): fila is Fila => typeof fila === "object" && !!fila)
    : [];
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function estadoCelda(
  estado: string | null,
  etiqueta: (valor: string | null) => string,
) {
  return <PartnerStatusBadge value={estado} label={etiqueta(estado)} />;
}

/**
 * Sucursales, QR y terminales del comercio, como tablas.
 *
 * Sólo salían dentro del volcado técnico del final, en crudo. Son lo que se mira para saber si el
 * comercio está listo para cobrar, así que van en palabras y con su estado en español. Llegan
 * enteras dentro del estado del comercio (una ficha), por eso se buscan en el cliente.
 */
export function PartnerNetworkLists({
  estado,
}: Readonly<{ estado: Record<string, unknown> }>) {
  const sucursales = filas(estado.branches);
  const qrs = filas(estado.qrCodes);
  const terminales = filas(estado.posTerminals);
  const nombreDeSucursal = new Map(
    sucursales.map((s) => [String(s.branchId), texto(s.name)]),
  );
  const sucursalDe = (fila: Fila) =>
    fila.branchId ? (nombreDeSucursal.get(String(fila.branchId)) ?? "—") : "—";

  const columnasSucursales: ColumnDef<Fila>[] = [
    {
      header: "Sucursal",
      accessorFn: (s) => safeText(texto(s.name) ?? texto(s.branchCode)),
    },
    {
      header: "Dirección",
      accessorFn: (s) => texto(s.addressLine) ?? "—",
    },
    { header: "Ciudad", accessorFn: (s) => texto(s.city) ?? "—" },
    {
      header: "Estado",
      accessorFn: (s) => networkStatusLabel(texto(s.status)),
      cell: ({ row }) =>
        estadoCelda(texto(row.original.status), networkStatusLabel),
    },
  ];
  const columnasQr: ColumnDef<Fila>[] = [
    { header: "Tipo", accessorFn: (q) => qrKindLabel(texto(q.qrKind)) },
    {
      header: "Cuenta",
      accessorFn: (q) => texto(q.accountNumberMasked) ?? "—",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {texto(row.original.accountNumberMasked) ?? "—"}
        </span>
      ),
    },
    { header: "Sucursal", accessorFn: sucursalDe },
    {
      header: "Subido",
      accessorFn: (q) => texto(q.createdAt) ?? "",
      cell: ({ row }) => formatDateTime(texto(row.original.createdAt)),
    },
    {
      header: "Estado",
      accessorFn: (q) => qrStatusLabel(texto(q.status)),
      cell: ({ row }) => estadoCelda(texto(row.original.status), qrStatusLabel),
    },
  ];
  const columnasTerminales: ColumnDef<Fila>[] = [
    {
      header: "Terminal",
      accessorFn: (t) =>
        safeText(texto(t.terminalAlias) ?? texto(t.terminalSerial)),
    },
    {
      header: "Serie",
      accessorFn: (t) => texto(t.terminalSerial) ?? "—",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {texto(row.original.terminalSerial) ?? "—"}
        </span>
      ),
    },
    { header: "Sucursal", accessorFn: sucursalDe },
    {
      header: "Estado",
      accessorFn: (t) => networkStatusLabel(texto(t.status)),
      cell: ({ row }) =>
        estadoCelda(texto(row.original.status), networkStatusLabel),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionTable
        title="Sucursales"
        data={sucursales}
        columns={columnasSucursales}
        searchText={(s) =>
          `${texto(s.name) ?? ""} ${texto(s.branchCode) ?? ""} ${texto(s.addressLine) ?? ""} ${texto(s.city) ?? ""} ${networkStatusLabel(texto(s.status))}`
        }
        searchPlaceholder="Buscar sucursal…"
        searchTooltip="Recorre todas las sucursales del comercio: coincide con parte del nombre, código, dirección, ciudad o estado."
        emptyTitle="No ha declarado sucursales."
        emptyDescription="Cuando el comercio declare una sucursal aparecerá aquí."
      />
      <SectionTable
        title="QR de cobro"
        data={qrs}
        columns={columnasQr}
        searchText={(q) =>
          `${qrKindLabel(texto(q.qrKind))} ${texto(q.accountNumberMasked) ?? ""} ${sucursalDe(q)} ${qrStatusLabel(texto(q.status))}`
        }
        searchPlaceholder="Buscar QR…"
        searchTooltip="Recorre todos los QR del comercio: coincide con parte del tipo, la cuenta, la sucursal o el estado."
        emptyTitle="No ha subido ningún QR."
        emptyDescription="Cuando el comercio suba un QR de cobro aparecerá aquí."
      />
      <SectionTable
        title="Terminales de venta"
        data={terminales}
        columns={columnasTerminales}
        searchText={(t) =>
          `${texto(t.terminalAlias) ?? ""} ${texto(t.terminalSerial) ?? ""} ${sucursalDe(t)} ${networkStatusLabel(texto(t.status))}`
        }
        searchPlaceholder="Buscar terminal…"
        searchTooltip="Recorre todos los terminales del comercio: coincide con parte del alias, la serie, la sucursal o el estado."
        emptyTitle="No tiene terminales."
        emptyDescription="Cuando se asigne un terminal de venta al comercio aparecerá aquí."
      />
    </div>
  );
}
