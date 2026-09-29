"use client";

import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  useMerchantUserCount,
  useMerchantUsers,
  usePendingProvisioningCount,
  useSetMerchantUserStatusMutation,
} from "./hooks";
import {
  MERCHANT_USER_STATUS_OPTIONS,
  formatCount,
  paginationOf,
} from "./labels";
import { buildIdentityColumns } from "./merchant-user-columns";
import { ProvisioningQueue } from "./provisioning-queue";
import { StatusChangeDialog } from "./status-change-dialog";
import type { MerchantUserProfile } from "./types";

/**
 * Identidades del canal del comercio.
 *
 * ## Esta pantalla ya no da de alta a nadie: concede lo que el ERP pide
 *
 * Tenía un botón «Dar de alta una identidad» con un formulario de correo, nombre y contraseña. Con
 * eso el portal interno se comportaba como el ORIGEN del usuario de comercio, y no lo es: la
 * relación comercial se firma en el ERP y allí están la cuenta B2B, la sucursal y el rol. El
 * resultado eran dos altas que no se conocían —la del CRM y la identidad tecleada aquí—, y un
 * carácter de diferencia en el correo bastaba para que la persona iniciara sesión sin alcance
 * ninguno, con el 403 apareciendo a dos sistemas de distancia de la causa.
 *
 * Ahora la pantalla tiene dos mitades y ese orden importa: arriba LA COLA, que es el trabajo
 * pendiente, y debajo las identidades ya concedidas, que es la consulta. El alta directa se retiró
 * también del backend, así que no queda una segunda puerta.
 *
 * Sigue sin vivir aquí a qué comercio pertenece cada persona: eso es del ERP, en otra base.
 */
export function MerchantUsersPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedMerchantUsersPage />
    </RoleGate>
  );
}

function AuthorizedMerchantUsersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [cambio, setCambio] = useState<{
    usuario: MerchantUserProfile;
    destino: string;
  } | null>(null);

  const usuarios = useMerchantUsers({
    page,
    limit: 25,
    ...(status ? { status } : {}),
    // `q` busca en correo, nombre y código de usuario (ILIKE en el servidor). Antes se mandaba
    // `email`, que exige el correo EXACTO: escribir la mitad no encontraba a nadie.
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  const cambiarEstado = useSetMerchantUserStatusMutation();
  const pendientes = usePendingProvisioningCount();
  const activas = useMerchantUserCount("active");
  const suspendidas = useMerchantUserCount("suspended");
  const dadasDeBaja = useMerchantUserCount("disabled");
  // `PATCH :id/status` exige `merchant.users.manage`: sin él no se ofrece el selector.
  const { hasPermission } = useAuth();
  const puedeCambiar = hasPermission("merchant.users.manage");

  const items = useMemo(() => usuarios.data?.items ?? [], [usuarios.data]);
  const columns = useMemo(
    () =>
      buildIdentityColumns(
        (usuario, destino) => setCambio({ usuario, destino }),
        puedeCambiar,
      ),
    [puedeCambiar],
  );
  const errorDeCambio = cambiarEstado.error
    ? isAtlasApiError(cambiarEstado.error)
      ? cambiarEstado.error.message
      : "No se pudo cambiar el estado del acceso."
    : null;

  return (
    <>
      <PageHeader
        icon={Store}
        eyebrow="Identidad del comercio"
        title="Usuarios de comercio"
        description="Conceder o rechazar los accesos que pide el ERP, y administrar los ya concedidos. Aquí no entra un comercio: esto lo opera el personal interno."
      />
      <BusinessContextNote>
        El ERP registra a la persona en el CRM del comercio y pide su acceso;
        esta consola lo concede. Los datos son los que mandó el ERP y no se
        pueden editar al aprobar: si el correo está mal, se corrige allí y se
        vuelve a pedir. La contraseña provisional la genera Atlas y se pide su
        envío por correo a la persona; ninguna pantalla la muestra.
      </BusinessContextNote>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Por atender"
          value={formatCount({ ...pendientes, total: pendientes.data })}
          hint="Peticiones pendientes de todo el ERP."
        />
        <MetricCard
          label="Identidades"
          value={formatCount({ ...usuarios, total: usuarios.data?.total })}
          hint={status || q ? "Con los filtros de la tabla." : "Todas."}
        />
        <MetricCard
          label="Activas"
          value={formatCount({ ...activas, total: activas.data })}
          hint="Todas las activas, sin filtros."
        />
        <MetricCard
          label="Suspendidas o dadas de baja"
          value={formatCount({
            isLoading: suspendidas.isLoading || dadasDeBaja.isLoading,
            error: suspendidas.error ?? dadasDeBaja.error,
            total:
              suspendidas.data === undefined || dadasDeBaja.data === undefined
                ? undefined
                : suspendidas.data + dadasDeBaja.data,
          })}
          hint="Todas, sin filtros."
        />
      </section>

      <ProvisioningQueue />

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold text-atlas-text">
          Identidades concedidas
        </h2>
        <p className="mb-4 text-sm text-atlas-muted">
          Quién puede entrar hoy al canal del comercio. Suspender corta el
          acceso en cuanto caduca su sesión actual; el historial se conserva.
        </p>
        <FilterBar
          search={q}
          searchPlaceholder="Buscar por correo, nombre o código…"
          searchTooltip="Busca en el servidor, en todas las identidades: coincide con parte del correo, del nombre o del código de usuario."
          filters={[
            {
              name: "status",
              label: "Estado",
              value: status,
              options: MERCHANT_USER_STATUS_OPTIONS,
              tooltip:
                "Deja sólo las identidades que están en ese estado de acceso.",
            },
          ]}
          onSearchChange={(valor) => {
            setQ(valor);
            setPage(1);
          }}
          onFilterChange={(nombre, valor) => {
            if (nombre === "status") setStatus(valor);
            setPage(1);
          }}
          onClear={() => {
            setQ("");
            setStatus("");
            setPage(1);
          }}
        />
        {usuarios.isLoading ? <LoadingSkeleton rows={6} /> : null}
        {usuarios.error ? (
          <ErrorState
            description={
              isAtlasApiError(usuarios.error)
                ? usuarios.error.message
                : "No se pudieron cargar las identidades de comercio."
            }
            requestId={
              isAtlasApiError(usuarios.error)
                ? usuarios.error.requestId
                : undefined
            }
            onRetry={() => void usuarios.refetch()}
          />
        ) : null}
        {usuarios.data ? (
          <DataTable
            data={items}
            columns={columns}
            meta={paginationOf(usuarios.data)}
            onPageChange={setPage}
            emptyTitle="Ninguna identidad concedida todavía."
            emptyDescription="Las que se concedan desde la cola de arriba aparecerán aquí."
          />
        ) : null}
      </Card>

      {cambio ? (
        <StatusChangeDialog
          usuario={cambio.usuario}
          destino={cambio.destino}
          isPending={cambiarEstado.isPending}
          error={errorDeCambio}
          onCancel={() => {
            cambiarEstado.reset();
            setCambio(null);
          }}
          onConfirm={(reason) => {
            // En error el diálogo sigue abierto con el motivo; sólo el éxito lo cierra.
            cambiarEstado
              .mutateAsync({
                merchantUserId: cambio.usuario.id,
                status: cambio.destino,
                ...(reason ? { reason } : {}),
              })
              .then(() => setCambio(null))
              .catch(() => undefined);
          }}
        />
      ) : null}
    </>
  );
}
