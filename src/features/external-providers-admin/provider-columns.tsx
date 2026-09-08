"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Coins, Settings2, UserRoundCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatNumber } from "@/shared/lib/format";
import {
  CredentialStatusBadge,
  TokenStatusBadge,
} from "./provider-auth-badges";
import {
  ProviderCategoryLabel,
  ProviderHealthBadge,
  ProviderModeBadge,
  ProviderStatusBadge,
} from "./provider-badges";
import type { Provider, ProviderAuthState, ProviderHealth } from "./types";

/**
 * Sólo estos modos salen a la red y cronometran la respuesta. `mock_local` y `disabled` devuelven
 * un veredicto constante sin llamar a nadie.
 */
export function esMedido(mode: string): boolean {
  return mode === "mock_server" || mode === "sandbox" || mode === "production";
}

export type ProviderRow = Provider & {
  health?: ProviderHealth;
  authState?: ProviderAuthState;
};

export function buildProviderColumns(
  onOpen: (provider: ProviderRow) => void,
): ColumnDef<ProviderRow>[] {
  return [
    {
      /*
       * Identidad del proveedor: código, nombre y familia, en una sola columna.
       *
       * La categoría tenía columna propia y es lo que menos se consulta de la fila —dice de qué
       * clase es el proveedor, algo que casi siempre ya se deduce de su nombre—, mientras costaba
       * unos 180 px que hacían falta al final de la tabla. `DataTable` dimensiona por contenido y
       * no recorta: lo que no cabe no se ve, y la columna clavada de la derecha se pinta encima de
       * la penúltima, que se lee cortada.
       */
      header: "Proveedor",
      accessorKey: "code",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-mono text-xs font-semibold text-atlas-text">
            {row.original.code}
          </p>
          <p className="text-xs text-atlas-muted">{row.original.name}</p>
          <div className="text-xs text-atlas-muted">
            <ProviderCategoryLabel value={row.original.category} />
          </div>
        </div>
      ),
    },
    {
      /*
       * «Estado» y «Modo» se leían como una contradicción —«Activo» junto a «Sólo simulado»— y
       * no lo son: contestan preguntas distintas. Los nombres nuevos lo dicen sin nota al pie.
       *
       * QUIÉN ES el proveedor: SEGIP e INFOCENTER son los oficiales que Atlas usará; los
       * genéricos son de relleno contractual mientras no haya proveedor firmado.
       */
      header: "Tipo de proveedor",
      accessorKey: "status",
      cell: ({ row }) => <ProviderStatusBadge value={row.original.status} />,
    },
    {
      // CÓMO SE LE LLAMA hoy. Es ortogonal a lo anterior: un proveedor oficial sin credenciales
      // todavía se llama en simulado, y las dos cosas son ciertas a la vez.
      header: "Cómo se le llama",
      accessorKey: "defaultMode",
      cell: ({ row }) => <ProviderModeBadge value={row.original.defaultMode} />,
    },
    {
      /*
       * Salud HONESTA.
       *
       * `checkMockHealth` devuelve `UP` y `0 ms` como constante en todo modo que no sea
       * `mock_server`: no hay llamada, no hay medición. Pintar «Responde · 0 ms» ahí afirmaba el
       * resultado de una comprobación que nunca ocurrió, y hacía indistinguible un proveedor
       * realmente sano de uno que nadie ha tocado.
       */
      header: "Salud",
      accessorKey: "health",
      cell: ({ row }) => {
        const { health, defaultMode } = row.original;
        if (!health) return <span className="text-atlas-muted">—</span>;
        if (!esMedido(defaultMode)) return <Badge tone="muted">Sin llamada</Badge>;
        return (
          <div className="space-y-1">
            <ProviderHealthBadge value={health.status} />
            <p className="whitespace-nowrap text-xs tabular-nums text-atlas-muted">
              {formatNumber(health.latencyMs)} ms
            </p>
          </div>
        );
      },
    },
    {
      /*
       * Credencial y token, juntas. Sigue SIN fundirse con «Salud», que es lo que de verdad
       * importa no mezclar: un proveedor puede responder perfectamente y tener la credencial
       * vencida, y eso hay que poder distinguirlo.
       *
       * Entre ellas dos, en cambio, no hay nada que distinguir de un vistazo: vienen del mismo
       * worker, se llenan a la vez y están las dos vacías cuando la autenticación no está
       * delegada, que es el caso hoy. Y ocupaban dos columnas de las que sacaban a otras tres
       * fuera de la pantalla: `DataTable` dimensiona por contenido y no recorta, así que la
       * columna clavada de la derecha se pintaba encima de la anterior.
       */
      header: "Autenticación",
      accessorKey: "authState",
      cell: ({ row }) => {
        const authState = row.original.authState;
        if (!authState) return <span className="text-atlas-muted">—</span>;
        return (
          <div className="flex flex-col items-start gap-1">
            <CredentialStatusBadge value={authState.credentialStatus} />
            <TokenStatusBadge value={authState.tokenStatus} />
          </div>
        );
      },
    },
    {
      /*
       * «Costoso» y «Aprobación manual» eran dos columnas con un «Sí/No» cada una.
       *
       * Dos columnas enteras para decir «no» once veces de doce: ocupaban casi 350 px para,
       * en la práctica, no marcar nada, y eran las que empujaban el botón de gestión fuera de
       * la pantalla. Aquí sólo aparece lo que ES cierto, con su icono; una fila sin marcas es
       * un proveedor sin restricciones, que es como se lee una lista de excepciones.
       */
      header: "Política",
      accessorKey: "isCostly",
      cell: ({ row }) => {
        const costoso = row.original.isCostly;
        const manual = row.original.requiresManualApproval;
        if (!costoso && !manual) {
          return <span className="text-atlas-muted">—</span>;
        }
        // APILADAS, no en fila: las dos juntas ensanchan la columna lo justo para que la columna
        // clavada de la derecha se pinte encima de la segunda y se lea a medias.
        return (
          <div className="flex flex-col items-start gap-1">
            {costoso ? (
              <Badge tone="critical" icon={Coins}>
                Costoso
              </Badge>
            ) : null}
            {manual ? (
              <Badge tone="warning" icon={UserRoundCheck}>
                Aprobación manual
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Detalle",
      // Clavada a la derecha: es la acción de la fila y la tabla se desplaza en horizontal.
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          onClick={() => onOpen(row.original)}
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          Gestionar
        </Button>
      ),
    },
  ];
}
