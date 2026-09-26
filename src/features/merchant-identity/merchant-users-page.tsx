"use client";

import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import {
  useMerchantUsers,
  useProvisioningRequests,
  useSetMerchantUserStatusMutation,
} from "./hooks";
import { buildIdentityColumns } from "./merchant-user-columns";
import { ProvisioningQueue } from "./provisioning-queue";
import { MERCHANT_USER_STATUSES, type MerchantUserProfile } from "./types";

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
  const [email, setEmail] = useState("");
  const [cambio, setCambio] = useState<{
    usuario: MerchantUserProfile;
    destino: string;
  } | null>(null);

  const usuarios = useMerchantUsers({
    page,
    limit: 25,
    ...(status ? { status } : {}),
    ...(email ? { email } : {}),
  });
  // Sin filtro de estado: la cola enseña lo pendiente Y lo ya resuelto, porque «¿en qué quedó lo
  // que pedí?» se pregunta tanto como «¿qué me falta por atender?».
  const peticiones = useProvisioningRequests({ page: 1, limit: 50 });
  const cambiarEstado = useSetMerchantUserStatusMutation();

  const items = useMemo(() => usuarios.data?.items ?? [], [usuarios.data]);
  const pendientes = useMemo(
    () =>
      (peticiones.data?.items ?? []).filter(
        (peticion) => peticion.status === "pending",
      ).length,
    [peticiones.data],
  );
  const columns = useMemo(
    () =>
      buildIdentityColumns((usuario, destino) =>
        setCambio({ usuario, destino }),
      ),
    [],
  );

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
        vuelve a pedir. La contraseña provisional la genera Atlas y se enseña
        una sola vez.
      </BusinessContextNote>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Por atender" value={formatNumber(pendientes)} />
        <MetricCard
          label="Identidades"
          value={formatNumber(usuarios.data?.total ?? 0)}
        />
        <MetricCard
          label="Activas"
          value={formatNumber(
            items.filter((u) => u.status === "active").length,
          )}
        />
        <MetricCard
          label="Suspendidas"
          value={formatNumber(
            items.filter(
              (u) => u.status === "suspended" || u.status === "disabled",
            ).length,
          )}
        />
      </section>

      <ProvisioningQueue query={peticiones} />

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold text-atlas-text">
          Identidades concedidas
        </h2>
        <p className="mb-4 text-sm text-atlas-muted">
          Quién puede entrar hoy al canal del comercio. Suspender corta el
          acceso en la siguiente rotación del token; el historial se conserva.
        </p>
        <FilterBar
          search={email}
          searchPlaceholder="Buscar por correo…"
          filters={[
            {
              name: "status",
              label: "Estado",
              value: status,
              options: MERCHANT_USER_STATUSES.map((valor) => ({
                value: valor,
                label: valor,
              })),
            },
          ]}
          onSearchChange={(valor) => {
            setEmail(valor);
            setPage(1);
          }}
          onFilterChange={(nombre, valor) => {
            if (nombre === "status") setStatus(valor);
            setPage(1);
          }}
          onClear={() => {
            setEmail("");
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
            meta={{
              page: usuarios.data.page,
              limit: usuarios.data.limit,
              total: usuarios.data.total,
              totalPages: Math.max(
                1,
                Math.ceil(usuarios.data.total / usuarios.data.limit),
              ),
            }}
            onPageChange={setPage}
            emptyTitle="Ninguna identidad concedida todavía."
            emptyDescription="Las que se concedan desde la cola de arriba aparecerán aquí."
          />
        ) : null}
      </Card>

      <ConfirmDialog
        open={cambio !== null}
        title={`Cambiar el acceso a «${cambio?.destino ?? ""}»`}
        description={`${cambio?.usuario.fullName ?? ""} pasará a ${cambio?.destino ?? ""}. Suspender corta su acceso al portal del comercio; su historial se conserva.`}
        confirmText="Cambiar"
        isLoading={cambiarEstado.isPending}
        onCancel={() => setCambio(null)}
        onConfirm={() => {
          if (!cambio) return;
          void cambiarEstado
            .mutateAsync({
              merchantUserId: cambio.usuario.id,
              status: cambio.destino,
            })
            .finally(() => setCambio(null));
        }}
      />
    </>
  );
}
