"use client";

import { useState } from "react";
import {
  useDiscoverEndpointsMutation,
  useInferDataImpactsMutation,
  useInferToolRequirementsMutation,
  useRefreshCatalogSeedMutation,
} from "@/features/systems/hooks";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState } from "@/shared/components/ui/states";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import { RefreshCw } from "lucide-react";

type ActionKey = "discover" | "seed" | "infer" | "inferImpacts";

export function CatalogSyncPage() {
  const [action, setAction] = useState<ActionKey | null>(null);
  const { hasPermission } = useAuth();
  const discoverMutation = useDiscoverEndpointsMutation();
  const refreshMutation = useRefreshCatalogSeedMutation();
  const inferMutation = useInferToolRequirementsMutation();
  const inferImpactsMutation = useInferDataImpactsMutation();
  const activeMutation = selectMutation(action, {
    discoverMutation,
    refreshMutation,
    inferMutation,
    inferImpactsMutation,
  });

  function runAction() {
    if (action === "discover") runDiscover();
    if (action === "seed") runSeedRefresh();
    if (action === "infer") runInferRequirements();
    if (action === "inferImpacts") runInferDataImpacts();
  }

  function runDiscover() {
    discoverMutation.mutate(
      // Del contrato OpenAPI del propio backend: la imagen desplegada no trae código fuente y el
      // escaneo (SOURCE_SCAN) respondía 503 en TEST. Con AtlasBackend#108 no pisa lo ya revisado.
      { mode: "OPENAPI_CONTRACT", persist: true },
      { onSuccess: () => setAction(null) },
    );
  }

  function runSeedRefresh() {
    refreshMutation.mutate(
      {
        includeTools: true,
        includeDataEntities: true,
        includeEndpointSeeds: true,
      },
      { onSuccess: () => setAction(null) },
    );
  }

  function runInferRequirements() {
    inferMutation.mutate(
      { persist: true },
      { onSuccess: () => setAction(null) },
    );
  }

  function runInferDataImpacts() {
    inferImpactsMutation.mutate(
      { persist: true },
      { onSuccess: () => setAction(null) },
    );
  }

  return (
    <PermissionGate
      permissions={[
        "systems.endpoints.discover",
        "systems.endpoints.catalogSeedRefresh",
        "systems.tools.inferRequirements",
      ]}
    >
      <PageHeader
        icon={RefreshCw}
        eyebrow="Sincronización"
        title="Actualizar inventario"
        description="Pone al día el inventario del sistema. No borra datos ni toca secretos, y cada acción pide confirmación."
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <SyncActionCard
          title="Buscar operaciones nuevas"
          description="Añade las operaciones nuevas del sistema y actualiza los datos técnicos de las que ya estaban, sin tocar su revisión ni su responsable. También se hace sola cada vez que el sistema arranca."
          disabled={!hasPermission("systems.endpoints.discover")}
          onClick={() => setAction("discover")}
        />
        <SyncActionCard
          title="Recargar la lista base"
          description="Vuelve a cargar la lista base de herramientas, tablas y operaciones que mantiene el equipo técnico."
          disabled={!hasPermission("systems.endpoints.catalogSeedRefresh")}
          onClick={() => setAction("seed")}
        />
        <SyncActionCard
          title="Inferir herramientas"
          description="Detecta qué herramientas usa cada operación y guarda el resultado."
          disabled={!hasPermission("systems.tools.inferRequirements")}
          onClick={() => setAction("infer")}
        />
        <SyncActionCard
          title="Detectar tablas por operación"
          description="Revisa cada operación para saber qué tablas lee o escribe y actualiza esa relación sola, sin tener que cargarla a mano."
          disabled={!hasPermission("systems.tools.inferRequirements")}
          onClick={() => setAction("inferImpacts")}
        />
      </div>
      <SyncResults
        discover={discoverMutation}
        refresh={refreshMutation}
        infer={inferMutation}
        inferImpacts={inferImpactsMutation}
      />
      <ConfirmDialog
        open={Boolean(action)}
        title="Confirmar sincronización"
        description="Esta acción cambia el inventario del sistema. Hazla solo después de confirmar con el equipo técnico que la última actualización ya está instalada."
        confirmText="Ejecutar"
        isLoading={activeMutation.isPending}
        onCancel={() => setAction(null)}
        onConfirm={runAction}
      />
    </PermissionGate>
  );
}

type MutationLike = {
  data?: unknown;
  error: unknown;
  isPending: boolean;
};

function selectMutation(
  action: ActionKey | null,
  mutations: {
    discoverMutation: MutationLike;
    refreshMutation: MutationLike;
    inferMutation: MutationLike;
    inferImpactsMutation: MutationLike;
  },
) {
  if (action === "discover") return mutations.discoverMutation;
  if (action === "seed") return mutations.refreshMutation;
  if (action === "inferImpacts") return mutations.inferImpactsMutation;
  return mutations.inferMutation;
}

function SyncActionCard({
  title,
  description,
  disabled,
  onClick,
}: Readonly<{
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title={title}
          description={description}
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <Button variant="primary" disabled={disabled} onClick={onClick}>
          Ejecutar
        </Button>
      </CardContent>
    </Card>
  );
}

function SyncResults({
  discover,
  refresh,
  infer,
  inferImpacts,
}: Readonly<{
  discover: MutationLike;
  refresh: MutationLike;
  infer: MutationLike;
  inferImpacts: MutationLike;
}>) {
  return (
    <div className="mt-6 space-y-4">
      {[discover, refresh, infer, inferImpacts].map((mutation, index) =>
        mutation.error ? (
          <MutationError key={index} error={mutation.error} />
        ) : null,
      )}
      {discover.data ? (
        <JsonViewer
          title="Resultado de la búsqueda de operaciones"
          value={discover.data}
        />
      ) : null}
      {refresh.data ? (
        <JsonViewer
          title="Resultado de la recarga de la lista base"
          value={refresh.data}
        />
      ) : null}
      {infer.data ? (
        <JsonViewer
          title="Resultado de la detección de herramientas"
          value={infer.data}
        />
      ) : null}
      {inferImpacts.data ? (
        <JsonViewer
          title="Resultado de la detección de tablas"
          value={inferImpacts.data}
        />
      ) : null}
    </div>
  );
}

function MutationError({ error }: Readonly<{ error: unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error) ? error.message : "No se pudo completar acción."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
