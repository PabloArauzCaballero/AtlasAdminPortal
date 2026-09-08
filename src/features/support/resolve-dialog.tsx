"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useResolveCaseMutation, useSupportCodes } from "./hooks";

const MINIMO = 10;

/**
 * Resolver es donde se captura el motivo por el que existe todo lo demás.
 *
 * `resolutionCode` y `rootCauseCode` son selectores obligatorios con su descripción al lado, y no
 * un texto libre: son las dos columnas con las que después se mide la operación, y hasta la
 * migración del 2026-09-05 la base las aceptaba en VARCHAR sin comprobar nada. El catálogo llega
 * del backend (`GET internal/support/codes`) en vez de estar copiado aquí.
 *
 * Las dos cajas de texto van SEPARADAS y etiquetadas por quien las va a leer. Cuando son una sola,
 * lo interno acaba llegando al cliente o lo del cliente acaba siendo el único registro que queda
 * para el equipo; ninguna de las dos cosas se puede deshacer después.
 */
export function ResolveDialog({
  caseId,
  onClose,
}: Readonly<{ caseId: string; onClose: () => void }>) {
  const codigos = useSupportCodes();
  const resolver = useResolveCaseMutation(caseId);
  const [resolutionCode, setResolutionCode] = useState("");
  const [rootCauseCode, setRootCauseCode] = useState("UNKNOWN");
  const [customerResolution, setCustomerResolution] = useState("");
  const [internalResolution, setInternalResolution] = useState("");

  const faltaTexto =
    customerResolution.trim().length < MINIMO ||
    internalResolution.trim().length < MINIMO;
  const listo = Boolean(resolutionCode) && !faltaTexto;

  const descripcion = (
    lista: { code: string; label: string }[] | undefined,
    code: string,
  ) => lista?.find((opcion) => opcion.code === code)?.label ?? null;

  return (
    <DrawerPanel open title={`Resolver el caso #${caseId}`} onClose={onClose}>
      {codigos.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {codigos.error ? (
        <ErrorState
          description={
            isAtlasApiError(codigos.error)
              ? codigos.error.message
              : "No se pudo cargar el catálogo de códigos."
          }
          onRetry={() => void codigos.refetch()}
        />
      ) : null}

      {codigos.data ? (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!listo) return;
            resolver.mutate(
              {
                resolutionCode,
                rootCauseCode,
                customerResolution: customerResolution.trim(),
                internalResolution: internalResolution.trim(),
              },
              { onSuccess: onClose },
            );
          }}
        >
          <Field
            label="Cómo se resolvió"
            hint={descripcion(codigos.data.resolutionCodes, resolutionCode) ?? undefined}
          >
            <Select
              value={resolutionCode}
              onChange={(event) => setResolutionCode(event.target.value)}
            >
              <option value="">Elegir…</option>
              {codigos.data.resolutionCodes.map((opcion) => (
                <option key={opcion.code} value={opcion.code}>
                  {opcion.code}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Por qué pasó (causa raíz)"
            hint={descripcion(codigos.data.rootCauseCodes, rootCauseCode) ?? undefined}
          >
            <Select
              value={rootCauseCode}
              onChange={(event) => setRootCauseCode(event.target.value)}
            >
              {codigos.data.rootCauseCodes.map((opcion) => (
                <option key={opcion.code} value={opcion.code}>
                  {opcion.code}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Lo que leerá el cliente"
            hint="Va al expediente del cliente. Mínimo 10 caracteres."
          >
            <Textarea
              className="min-h-24"
              value={customerResolution}
              onChange={(event) => setCustomerResolution(event.target.value)}
            />
          </Field>

          <Field
            label="Lo que queda para el equipo"
            hint="No lo ve el cliente. Mínimo 10 caracteres."
          >
            <Textarea
              className="min-h-24"
              value={internalResolution}
              onChange={(event) => setInternalResolution(event.target.value)}
            />
          </Field>

          {resolver.error && isAtlasApiError(resolver.error) ? (
            <ErrorState
              description={resolver.error.message}
              requestId={resolver.error.requestId}
            />
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!listo}
              isLoading={resolver.isPending}
            >
              Resolver
            </Button>
          </div>
        </form>
      ) : null}
    </DrawerPanel>
  );
}
