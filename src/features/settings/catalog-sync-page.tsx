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
      { mode: "SOURCE_SCAN", persist: true },
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
        eyebrow="Sincronización"
        title="Sincronización de catálogo"
        description="Acciones controladas sobre Systems Ops. No ejecuta seeds destructivos ni toca secretos. Toda acción crítica requiere confirmación."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SyncActionCard
          title="Descubrir endpoints"
          description="Ejecuta `/systems/endpoints/discover` en modo SOURCE_SCAN."
          disabled={!hasPermission("systems.endpoints.discover")}
          onClick={() => setAction("discover")}
        />
        <SyncActionCard
          title="Refrescar seed de catálogo"
          description="Ejecuta `/systems/endpoints/catalog-seed/refresh` con tools, data entities y endpoint seeds."
          disabled={!hasPermission("systems.endpoints.catalogSeedRefresh")}
          onClick={() => setAction("seed")}
        />
        <SyncActionCard
          title="Inferir herramientas"
          description="Ejecuta `/systems/tools/infer-requirements` con persist=true."
          disabled={!hasPermission("systems.tools.inferRequirements")}
          onClick={() => setAction("infer")}
        />
        <SyncActionCard
          title="Inferir impactos endpoint-tabla"
          description="Ejecuta `/systems/data-entities/infer-impacts`: escanea el código fuente de cada endpoint en busca de modelos Sequelize (lectura/escritura) para poblar la relación endpoint↔tabla automáticamente, sin depender de un seed curado a mano."
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
        description="Esta acción modifica metadata del catálogo de sistemas. Debe ejecutarse solo después de revisar migraciones y seeds relacionadas con cambios recientes."
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
        <JsonViewer title="Resultado discover" value={discover.data} />
      ) : null}
      {refresh.data ? (
        <JsonViewer title="Resultado seed refresh" value={refresh.data} />
      ) : null}
      {infer.data ? (
        <JsonViewer title="Resultado inferencia" value={infer.data} />
      ) : null}
      {inferImpacts.data ? (
        <JsonViewer
          title="Resultado inferencia de impactos"
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
