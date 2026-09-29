"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Landmark, Plus } from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { RoleGate } from "@/shared/auth/role-gate";
import { CREDIT_OPERATIONS_ROLE_LIST } from "@/shared/auth/portal-roles";
import { productStatusLabel } from "./credit-options";
import { creditErrorMessage } from "./credit-rules";
import { toCreateProductBody } from "./credit-schemas";
import {
  useChangeCreditProductStatusMutation,
  useCreateCreditProductMutation,
  useCreditProducts,
} from "./hooks";
import { ProductCreateDialog } from "./product-create-dialog";
import { buildProductColumns } from "./product-columns";
import { ProductStatusDialog } from "./product-status-dialog";
import type { CreateCreditProductResult, CreditProductStatus } from "./types";

type StatusTarget = {
  productId: string;
  productName: string;
  to: CreditProductStatus;
};

export function CreditProductsPage() {
  return (
    <RoleGate roles={CREDIT_OPERATIONS_ROLE_LIST}>
      <CreditProductsContent />
    </RoleGate>
  );
}

function CreditProductsContent() {
  const products = useCreditProducts();
  const create = useCreateCreditProductMutation();
  const changeStatus = useChangeCreditProductStatusMutation();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateCreditProductResult | null>(
    null,
  );
  const [target, setTarget] = useState<StatusTarget | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      buildProductColumns((product, to) => {
        changeStatus.reset();
        setTarget({
          productId: product.id,
          productName: product.productName,
          to,
        });
      }),
    [changeStatus],
  );
  const items = products.data?.products ?? [];

  return (
    <>
      <PageHeader
        icon={Landmark}
        eyebrow="Crédito"
        title="Productos de crédito"
        description="El catálogo que se ofrece a los clientes: montos, plazos, tasa y si cada solicitud pasa por una persona."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              create.reset();
              setCreating(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo producto
          </Button>
        }
      />
      <BusinessContextNote>
        La lista enseña TODO el catálogo: borradores, activos, suspendidos y
        retirados. A los clientes sólo se les ofrecen los activos y dentro de su
        vigencia. Un producto nuevo nace en borrador: al crearlo te ofrecemos
        activarlo en el momento. Retirar es definitivo.
      </BusinessContextNote>
      {aviso ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {aviso}
        </p>
      ) : null}
      {created ? (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-atlas-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-atlas-text">
            Producto <span className="font-mono">{created.productCode}</span>{" "}
            creado en borrador. Nadie lo ve todavía.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setCreated(null)}>Dejar en borrador</Button>
            <Button
              variant="primary"
              onClick={() => {
                changeStatus.reset();
                setTarget({
                  productId: created.productId,
                  productName: created.productCode,
                  to: "active",
                });
              }}
            >
              Activar ahora
            </Button>
          </div>
        </div>
      ) : null}
      {products.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {products.error ? (
        <ErrorState
          description={creditErrorMessage(
            products.error,
            "No se pudo cargar el catálogo de crédito.",
          )}
          onRetry={() => void products.refetch()}
        />
      ) : null}
      {products.data ? (
        <DataTable
          data={items}
          columns={columns}
          emptyTitle="No hay productos de crédito ofreciéndose."
          emptyDescription="Crea el primero con «Nuevo producto» y actívalo cuando el negocio lo apruebe."
        />
      ) : null}
      {creating ? (
        <ProductCreateDialog
          isLoading={create.isPending}
          error={create.error}
          onCancel={() => setCreating(false)}
          onSubmit={(values) =>
            create.mutate(toCreateProductBody(values), {
              onSuccess: (result) => {
                setCreating(false);
                setAviso(null);
                setCreated(result);
              },
            })
          }
        />
      ) : null}
      {target ? (
        <ProductStatusDialog
          productName={target.productName}
          to={target.to}
          isLoading={changeStatus.isPending}
          error={changeStatus.error}
          onCancel={() => setTarget(null)}
          onSubmit={(values) =>
            changeStatus.mutate(
              { productId: target.productId, body: values },
              {
                onSuccess: (result) => {
                  setTarget(null);
                  if (created?.productId === result.productId) setCreated(null);
                  setAviso(
                    `«${target.productName}» pasó a ${productStatusLabel(result.status).toLowerCase()}.`,
                  );
                },
              },
            )
          }
        />
      ) : null}
    </>
  );
}
