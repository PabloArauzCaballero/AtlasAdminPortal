"use client";

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

/**
 * Sucursales, QR y terminales del comercio, como listas legibles.
 *
 * Sólo salían dentro del volcado técnico del final, en crudo. Son lo que se mira para saber si el
 * comercio está listo para cobrar, así que van en palabras y con su estado en español.
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

  return (
    <div className="space-y-4">
      <Lista titulo="Sucursales" vacio="No ha declarado sucursales.">
        {sucursales.map((s) => (
          <Item
            key={String(s.branchId)}
            titulo={safeText(texto(s.name) ?? texto(s.branchCode))}
            detalle={[texto(s.addressLine), texto(s.city)]
              .filter(Boolean)
              .join(" · ")}
            estado={texto(s.status)}
            etiqueta={networkStatusLabel(texto(s.status))}
          />
        ))}
      </Lista>
      <Lista titulo="QR de cobro" vacio="No ha subido ningún QR.">
        {qrs.map((q) => (
          <Item
            key={String(q.qrId)}
            titulo={qrKindLabel(texto(q.qrKind))}
            detalle={[
              texto(q.accountNumberMasked)
                ? `Cuenta ${String(q.accountNumberMasked)}`
                : null,
              q.branchId
                ? (nombreDeSucursal.get(String(q.branchId)) ?? null)
                : null,
              texto(q.createdAt)
                ? `Subido ${formatDateTime(String(q.createdAt))}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            estado={texto(q.status)}
            etiqueta={qrStatusLabel(texto(q.status))}
          />
        ))}
      </Lista>
      <Lista titulo="Terminales de venta" vacio="No tiene terminales.">
        {terminales.map((t) => (
          <Item
            key={String(t.terminalId)}
            titulo={safeText(texto(t.terminalAlias) ?? texto(t.terminalSerial))}
            detalle={[
              texto(t.terminalSerial)
                ? `Serie ${String(t.terminalSerial)}`
                : null,
              t.branchId
                ? (nombreDeSucursal.get(String(t.branchId)) ?? null)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            estado={texto(t.status)}
            etiqueta={networkStatusLabel(texto(t.status))}
          />
        ))}
      </Lista>
    </div>
  );
}

function Lista({
  titulo,
  vacio,
  children,
}: Readonly<{ titulo: string; vacio: string; children: React.ReactNode[] }>) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-atlas-text">{`${titulo} (${children.length})`}</h3>
      {children.length === 0 ? (
        <p className="text-xs text-atlas-muted">{vacio}</p>
      ) : (
        <ul className="divide-y divide-atlas-border rounded-md border border-atlas-border">
          {children}
        </ul>
      )}
    </section>
  );
}

function Item({
  titulo,
  detalle,
  estado,
  etiqueta,
}: Readonly<{
  titulo: string;
  detalle: string;
  estado: string | null;
  etiqueta: string;
}>) {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-atlas-text">{titulo}</p>
        {detalle ? (
          <p className="truncate text-xs text-atlas-muted">{detalle}</p>
        ) : null}
      </div>
      <PartnerStatusBadge value={estado} label={etiqueta} />
    </li>
  );
}
