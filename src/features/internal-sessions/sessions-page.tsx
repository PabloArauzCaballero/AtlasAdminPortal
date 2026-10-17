"use client";

import { useMemo, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { useInternalSessions } from "./hooks";
import { RevokeSessionsDialog } from "./revoke-sessions-dialog";
import { buildSessionColumns } from "./sessions-columns";
import type { InternalSessionItem } from "./types";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 25;

export function SessionsPage() {
  // Mismo motivo que en «Usuarios internos»: con los hooks fuera del gate, quien no tiene permiso
  // dispararía igual la petición.
  return (
    <PermissionGate permissions={["internal.sessions.read"]}>
      <AuthorizedSessionsPage />
    </PermissionGate>
  );
}

function AuthorizedSessionsPage() {
  const [page, setPage] = useState(1);
  const [aCerrar, setACerrar] = useState<InternalSessionItem | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const sessions = useInternalSessions({
    page,
    limit: usePageSize(POR_PAGINA),
  });
  const { hasPermission, user } = useAuth();
  const canRevoke = hasPermission("internal.users.manage");
  const columns = useMemo(
    () =>
      buildSessionColumns({
        canRevoke,
        currentUserId: user?.id ?? null,
        onRevoke: (session) => {
          setAviso(null);
          setACerrar(session);
        },
      }),
    [canRevoke, user?.id],
  );
  const resumen = sessions.data?.summary;

  return (
    <>
      <PageHeader
        icon={MonitorSmartphone}
        eyebrow="Usuarios internos"
        title="Sesiones activas"
        description={
          resumen
            ? `${formatNumber(resumen.openSessions)} sesiones abiertas de ${formatNumber(resumen.people)} personas.`
            : "Quién del equipo tiene sesión abierta en los portales, desde dónde y desde cuándo."
        }
      />
      <BusinessContextNote>
        Cada fila es una sesión abierta en un equipo. «Activa ahora» quiere
        decir que se usó en la última hora; una sesión sin actividad reciente
        suele ser una pestaña que alguien dejó abierta, y sigue valiendo hasta
        que vence. Si alguien deja el equipo o pierde su portátil, cierra sus
        sesiones: sale de inmediato en todos sus equipos.
      </BusinessContextNote>
      {aviso ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {aviso}
        </div>
      ) : null}
      {sessions.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {sessions.error ? (
        <ErrorState
          description={
            isAtlasApiError(sessions.error)
              ? sessions.error.message
              : "No se pudieron cargar las sesiones abiertas."
          }
          requestId={
            isAtlasApiError(sessions.error)
              ? sessions.error.requestId
              : undefined
          }
          onRetry={() => void sessions.refetch()}
        />
      ) : null}
      {sessions.data ? (
        <DataTable
          data={sessions.data.items}
          columns={columns}
          meta={sessions.data.meta}
          onPageChange={setPage}
          emptyTitle="Nadie del equipo tiene sesión abierta."
          emptyDescription="Cuando alguien entre a un portal aparecerá aquí, con su IP y su dispositivo."
        />
      ) : null}
      <RevokeSessionsDialog
        session={aCerrar}
        onClose={() => setACerrar(null)}
        onDone={setAviso}
      />
    </>
  );
}
