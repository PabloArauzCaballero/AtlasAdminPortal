"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge, statusTone } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/input";
import { formatBoolean, formatDateTime, safeText } from "@/shared/lib/format";
import {
  merchantUserStatusLabel,
  provisioningStatusLabel,
  statusChangeOptions,
} from "./labels";
import type { MerchantProvisioningRequest, MerchantUserProfile } from "./types";

/*
 * POR QUÉ LAS CELDAS DE ESTA TABLA LLEVAN UN ANCHO FIJO EN `ch`.
 *
 * La tabla se pinta con `min-w-max`: el navegador la dimensiona por su contenido y NO recorta,
 * así que un `truncate` dentro de una celda no reduce el ancho que la columna reclama —sólo pone
 * puntos suspensivos si algo la ha estrechado antes—. Con tres columnas de texto libre (razón
 * social, correo de la persona, correo de quien lo pidió) la fila se iba más allá de la tarjeta, y
 * entonces la columna de decisión, que va clavada a la derecha, se pintaba ENCIMA de la del
 * estado: se leía «pendi» y «reject». Fijar el ancho es lo único que la tabla respeta; el valor
 * entero sigue en el `title`.
 */

/**
 * Las identidades ya concedidas. La única acción de la fila va clavada a la derecha.
 *
 * `puedeCambiar` es si la sesión lleva `merchant.users.manage`: `PATCH :id/status` lo exige, y
 * ofrecer el selector a quien no lo tiene terminaba en un 403 que nadie veía.
 */
export function buildIdentityColumns(
  onCambiar: (usuario: MerchantUserProfile, destino: string) => void,
  puedeCambiar = true,
): ColumnDef<MerchantUserProfile>[] {
  return [
    {
      accessorKey: "fullName",
      header: "Usuario",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-atlas-text">
            {row.original.fullName}
          </p>
          <p className="truncate text-xs text-atlas-muted">
            {row.original.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge tone={statusTone(row.original.status)} dot>
          {merchantUserStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "mustChangePassword",
      header: "Debe cambiar clave",
      enableSorting: false,
      cell: ({ row }) => formatBoolean(row.original.mustChangePassword),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Último acceso",
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.lastLoginAt),
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) =>
        puedeCambiar ? (
          <Select
            name={`estado-${row.original.id}`}
            ariaLabel={`Cambiar estado de ${row.original.fullName}`}
            value=""
            placeholder="Cambiar estado…"
            onChange={(valor) => {
              if (valor) onCambiar(row.original, valor);
            }}
            options={statusChangeOptions(row.original.status)}
          />
        ) : (
          <span
            className="text-xs text-atlas-muted"
            title="Cambiar el estado de un acceso lo hace el equipo de Operaciones de comercios."
          >
            Sin permiso para cambiarlo
          </span>
        ),
    },
  ];
}

/**
 * La cola de peticiones del ERP.
 *
 * El comercio va PRIMERO y la persona debajo: quien atiende esta cola decide sobre «este comercio
 * pide acceso para esta persona», y al revés —persona primero— la pantalla se leía como un listado
 * de gente suelta sin contexto para aprobar nada.
 */
export function buildRequestColumns(
  onDecidir: (
    peticion: MerchantProvisioningRequest,
    accion: "aprobar" | "rechazar",
  ) => void,
  /**
   * Si la sesión lleva `merchant.users.manage`. Conceder es de `MERCHANT_OPERATIONS`; quien sólo
   * puede PEDIR (`OPERATIONS_MANAGER`) ve la cola pero no los botones: antes se le ofrecían y el
   * backend respondía 403.
   */
  puedeDecidir = true,
): ColumnDef<MerchantProvisioningRequest>[] {
  return [
    {
      accessorKey: "accountName",
      header: "Comercio",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="w-[24ch]">
          <p className="truncate font-medium text-atlas-text">
            {safeText(row.original.accountName)}
          </p>
          <p className="truncate text-xs text-atlas-muted">
            {row.original.branchName ?? "Sin sucursal declarada"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "fullName",
      header: "Persona",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="w-[26ch]">
          <p className="truncate text-atlas-text">{row.original.fullName}</p>
          <p className="truncate text-xs text-atlas-muted">
            {row.original.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "requestedAt",
      header: "Pedido",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="w-[22ch]">
          <p className="truncate text-atlas-text">
            {formatDateTime(row.original.requestedAt)}
          </p>
          <p
            className="truncate text-xs text-atlas-muted"
            title={row.original.requestedBy ?? undefined}
          >
            {row.original.requestedBy
              ? `Lo pidió ${row.original.requestedBy}`
              : "Sin autor declarado"}
          </p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Decisión",
      enableSorting: false,
      /*
       * El ESTADO va dentro de esta celda y no en una columna propia.
       *
       * Estaba aparte, justo a la izquierda de esta —que va clavada al borde derecho—, y la columna
       * clavada se pintaba encima: se leía «pendi» y «reject». Se puede pelear con anchos fijos,
       * pero la tabla se dimensiona por su contenido (`min-w-max`) y siempre acababa desbordando
       * con una columna más. Juntarlos arregla las dos cosas a la vez: la tabla cabe y el estado
       * viaja pegado a la acción que le corresponde, que es como se lee la fila de todos modos.
       */
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) =>
        row.original.status === "pending" && !puedeDecidir ? (
          <span
            className="text-xs text-atlas-muted"
            title="Conceder o rechazar un acceso lo hace el equipo de Operaciones de comercios."
          >
            Pendiente · la concede Operaciones de comercios
          </span>
        ) : row.original.status === "pending" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              className="h-8 px-2 text-xs"
              onClick={() => onDecidir(row.original, "aprobar")}
            >
              Conceder
            </Button>
            <Button
              variant="danger"
              className="h-8 px-2 text-xs"
              onClick={() => onDecidir(row.original, "rechazar")}
            >
              Rechazar
            </Button>
          </div>
        ) : (
          <div className="w-[26ch]">
            <Badge tone={statusTone(row.original.status)} dot>
              {provisioningStatusLabel(row.original.status)}
            </Badge>
            <p
              className="truncate text-xs text-atlas-muted"
              title={row.original.rejectionReason ?? undefined}
            >
              {row.original.rejectionReason ??
                formatDateTime(row.original.decidedAt)}
            </p>
          </div>
        ),
    },
  ];
}
