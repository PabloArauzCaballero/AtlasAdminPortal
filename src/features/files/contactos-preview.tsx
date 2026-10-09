"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { apiErrorText } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Field, Textarea } from "@/shared/components/ui/input";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { BloqueDeTexto } from "./bloque-de-texto";
import { explicarError } from "./errores";
import { useContactos } from "./hooks";
import { revelarContactos } from "./services";

/** Los mismos límites que valida el backend en `POST …/contactos/revelar`. */
export const MOTIVO_REVELAR_MINIMO = 8;
export const MOTIVO_REVELAR_MAXIMO = 500;

/** El motivo, o por qué todavía no vale. `null` cuando se puede mandar. */
export function problemaDelMotivo(motivo: string): string | null {
  const largo = motivo.trim().length;
  if (largo < MOTIVO_REVELAR_MINIMO)
    return `El motivo necesita al menos ${String(MOTIVO_REVELAR_MINIMO)} caracteres (llevas ${String(largo)}).`;
  if (largo > MOTIVO_REVELAR_MAXIMO)
    return `El motivo no puede pasar de ${String(MOTIVO_REVELAR_MAXIMO)} caracteres (llevas ${String(largo)}). Resúmelo.`;
  return null;
}

/**
 * El nodo de contactos del expediente: enmascarado siempre, y completo sólo a petición.
 *
 * Revelar es un POST con el motivo en el cuerpo (ADM-10), nunca un GET con el motivo en la URL. Lo
 * revelado vive en el estado de la mutación —con `gcTime: 0`, que lo descarta al desmontar— y no en
 * la caché de consultas: cerrar el panel, cambiar de nodo o pulsar «Ocultar» lo tira, y reabrir
 * vuelve a enseñar la versión enmascarada.
 */
export function VistaDeContactos({
  expedienteId,
}: Readonly<{ expedienteId: string }>) {
  const contactos = useContactos(expedienteId);
  const revelado = useMutation({
    mutationFn: (motivo: string) => revelarContactos(expedienteId, motivo),
    gcTime: 0,
  });

  if (contactos.isLoading) return <LoadingSkeleton rows={4} />;
  if (contactos.error)
    return <EmptyState title="No se pudieron traer los contactos." />;

  const datos = revelado.data ?? contactos.data;
  return (
    <div className="space-y-2">
      {revelado.data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <span>
            Datos completos. Tu consulta y su motivo quedaron registrados.
          </span>
          <Button variant="secondary" onClick={() => revelado.reset()}>
            <EyeOff className="mr-1.5 h-4 w-4" aria-hidden />
            Ocultar
          </Button>
        </div>
      ) : contactos.data?.enmascarado ? (
        <>
          <p className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <TriangleAlert
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden
            />
            Teléfonos y nombres van enmascarados. Verlos completos exige el
            permiso de revelado y deja constancia de quién lo pidió y por qué.
          </p>
          <PermissionGate
            permissions={["expedientes.pii.revelar"]}
            fallback={null}
          >
            <FormularioDeRevelado
              enCurso={revelado.isPending}
              error={
                revelado.error
                  ? explicarError(
                      revelado.error,
                      apiErrorText(
                        revelado.error,
                        "No se pudieron revelar los contactos. Vuelve a intentarlo.",
                      ),
                    )
                  : null
              }
              onRevelar={(motivo) => revelado.mutate(motivo)}
            />
          </PermissionGate>
        </>
      ) : null}
      <BloqueDeTexto texto={JSON.stringify(datos, null, 2)} />
    </div>
  );
}

function FormularioDeRevelado({
  enCurso,
  error,
  onRevelar,
}: Readonly<{
  enCurso: boolean;
  error: string | null;
  onRevelar: (motivo: string) => void;
}>) {
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);
  const problema = problemaDelMotivo(motivo);
  const verProblema = intentado || motivo.length > 0;

  return (
    <form
      className="space-y-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        setIntentado(true);
        if (problema || enCurso) return;
        onRevelar(motivo.trim());
      }}
    >
      <Field
        label="Motivo para ver los contactos completos"
        tooltip="Queda registrado junto a tu usuario. Explica el caso concreto, por ejemplo: verificar la referencia antes de aprobar el crédito."
        hint={`Entre ${String(MOTIVO_REVELAR_MINIMO)} y ${String(MOTIVO_REVELAR_MAXIMO)} caracteres. Llevas ${String(motivo.trim().length)}.`}
        error={verProblema && problema ? problema : undefined}
      >
        <Textarea
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          rows={2}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        disabled={enCurso}
        isLoading={enCurso}
        loadingText="Revelando…"
      >
        <Eye className="mr-1.5 h-4 w-4" aria-hidden />
        Revelar contactos
      </Button>
    </form>
  );
}
