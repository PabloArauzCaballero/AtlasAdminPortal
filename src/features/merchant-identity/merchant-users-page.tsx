"use client";

import { useMemo, useState } from "react";
import { Store } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import {
  useCreateMerchantUserMutation,
  useMerchantUsers,
  useSetMerchantUserStatusMutation,
} from "./hooks";
import { MERCHANT_USER_STATUSES, type MerchantUserProfile } from "./types";

/**
 * Identidades del canal del comercio.
 *
 * Aquí NO entra un comercio: es la contraparte interna del onboarding. Sin esta pantalla, dar
 * acceso al personal de un comercio afiliado sólo se podía por semilla, así que un comercio recién
 * aprobado no tenía con qué entrar.
 *
 * La contraseña se fija al crear y el usuario la cambia al primer acceso —el backend marca
 * `mustChangePassword`—: es el único momento en que una contraseña pasa por esta consola, y por eso
 * no se puede consultar después, sólo reemplazar por otra alta.
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
  const [alta, setAlta] = useState(false);
  const [cambio, setCambio] = useState<{ usuario: MerchantUserProfile; destino: string } | null>(null);

  const usuarios = useMerchantUsers({
    page,
    limit: 25,
    ...(status ? { status } : {}),
    ...(email ? { email } : {}),
  });
  const crear = useCreateMerchantUserMutation();
  const cambiarEstado = useSetMerchantUserStatusMutation();

  const items = useMemo(() => usuarios.data?.items ?? [], [usuarios.data]);
  const columns = useMemo(
    () => buildColumns((usuario, destino) => setCambio({ usuario, destino })),
    [],
  );

  return (
    <>
      <PageHeader
        icon={Store}
        eyebrow="Identidad del comercio"
        title="Usuarios de comercio"
        description="Quién puede operar el canal del comercio afiliado. No es el portal del comercio: esto lo administra el personal interno."
      />
      <FilterBar
        search={email}
        searchPlaceholder="Buscar por correo…"
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: MERCHANT_USER_STATUSES.map((valor) => ({ value: valor, label: valor })),
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
            isAtlasApiError(usuarios.error) ? usuarios.error.requestId : undefined
          }
          onRetry={() => void usuarios.refetch()}
        />
      ) : null}

      {usuarios.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Identidades" value={formatNumber(usuarios.data.total)} />
            <MetricCard
              label="Activas"
              value={formatNumber(items.filter((u) => u.status === "active").length)}
            />
            <MetricCard
              label="Invitadas"
              value={formatNumber(items.filter((u) => u.status === "invited").length)}
            />
            <MetricCard
              label="Suspendidas"
              value={formatNumber(
                items.filter((u) => u.status === "suspended" || u.status === "disabled").length,
              )}
            />
          </section>

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setAlta(true)}>
              Dar de alta una identidad
            </Button>
          </div>

          <DataTable
            data={items}
            columns={columns}
            meta={{
              page: usuarios.data.page,
              limit: usuarios.data.limit,
              total: usuarios.data.total,
              totalPages: Math.max(1, Math.ceil(usuarios.data.total / usuarios.data.limit)),
            }}
            onPageChange={setPage}
            emptyTitle="Sin identidades de comercio."
            emptyDescription="Un comercio aprobado sin identidad no tiene con qué entrar al portal."
          />
        </div>
      ) : null}

      {alta ? (
        <AltaDialog
          onClose={() => setAlta(false)}
          onSubmit={async (valores) => {
            await crear.mutateAsync(valores);
            setAlta(false);
          }}
          isPending={crear.isPending}
          error={
            crear.error
              ? isAtlasApiError(crear.error)
                ? crear.error.message
                : "No se pudo crear la identidad."
              : null
          }
        />
      ) : null}

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

function AltaDialog({
  onClose,
  onSubmit,
  isPending,
  error,
}: Readonly<{
  onClose: () => void;
  onSubmit: (valores: {
    email: string;
    fullName: string;
    password: string;
    phone?: string;
    userCode?: string;
  }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}>) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <Card className="fixed inset-x-4 top-24 z-50 mx-auto max-w-xl">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        Nueva identidad de comercio
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        La contraseña es provisional: el backend obliga a cambiarla en el primer acceso. Diez
        caracteres mínimo.
      </p>
      <div className="space-y-3">
        <Field label="Correo">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Nombre completo">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Contraseña provisional" hint="Mínimo 10 caracteres.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Teléfono">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={isPending || password.length < 10 || !email || fullName.length < 3}
            onClick={() =>
              void onSubmit({
                email,
                fullName,
                password,
                ...(phone ? { phone } : {}),
              })
            }
          >
            Crear identidad
          </Button>
        </div>
      </div>
    </Card>
  );
}

function buildColumns(
  onCambiar: (usuario: MerchantUserProfile, destino: string) => void,
): ColumnDef<MerchantUserProfile>[] {
  return [
    {
      accessorKey: "fullName",
      header: "Usuario",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-atlas-text">{row.original.fullName}</p>
          <p className="text-xs text-atlas-muted">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      accessorKey: "mustChangePassword",
      header: "Debe cambiar clave",
      cell: ({ row }) => (row.original.mustChangePassword ? "Sí" : "No"),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Último acceso",
      cell: ({ row }) => formatDateTime(row.original.lastLoginAt),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Select
          aria-label={`Cambiar estado de ${row.original.fullName}`}
          value=""
          onChange={(evento) => {
            if (evento.target.value) onCambiar(row.original, evento.target.value);
          }}
        >
          <option value="">Cambiar estado…</option>
          {MERCHANT_USER_STATUSES.filter((estado) => estado !== row.original.status).map(
            (estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ),
          )}
        </Select>
      ),
    },
  ];
}
