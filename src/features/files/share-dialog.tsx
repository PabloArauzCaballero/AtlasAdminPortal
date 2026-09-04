"use client";

import { useId, useState } from "react";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badges";
import { useCompartir, useConcesiones } from "./hooks";
import { NIVELES, type Nivel, type Nodo } from "./types";

const ROLES_SUGERIDOS = [
  "OPERATIONS_ANALYST",
  "OPERATIONS_MANAGER",
  "RISK_ANALYST",
  "RISK_MANAGER",
  "FRAUD_ANALYST",
  "COMPLIANCE_ANALYST",
  "COMPLIANCE_MANAGER",
  "AUDITOR_READONLY",
] as const;

/**
 * Compartir una carpeta de evidencia.
 *
 * El motivo es OBLIGATORIO y no es burocracia: ampliar quién puede ver el carnet y la cara de una
 * persona es una decisión sobre datos de un tercero, y dentro de seis meses «se compartió con
 * fraude» sin más no explica nada. El backend lo exige igual; aquí se pide antes para no gastar un
 * viaje en un 400 previsible.
 */
export function DialogoDeCompartir({
  expedienteId,
  nodo,
  abierto,
  onCerrar,
}: Readonly<{
  expedienteId: string;
  nodo: Nodo;
  abierto: boolean;
  onCerrar: () => void;
}>) {
  const tituloId = useId();
  const concesiones = useConcesiones(
    expedienteId,
    abierto ? nodo.nodoId : null,
  );
  const { conceder, revocar } = useCompartir(expedienteId, nodo.nodoId);

  const [principalTipo, setPrincipalTipo] = useState<"rol" | "usuario_interno">(
    "rol",
  );
  const [principalId, setPrincipalId] = useState<string>(ROLES_SUGERIDOS[0]);
  const [nivel, setNivel] = useState<Nivel>("leer");
  const [motivo, setMotivo] = useState("");

  const motivoValido = motivo.trim().length >= 8;

  return (
    <DialogShell
      open={abierto}
      labelledBy={tituloId}
      onClose={onCerrar}
      closeOnBackdrop
    >
      <div className="w-[34rem] max-w-full space-y-4 p-5">
        <div>
          <h2 id={tituloId} className="text-base font-semibold text-atlas-text">
            Quién puede ver «{nodo.nombre}»
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            El acceso se hereda hacia lo que hay dentro. Se registra quién lo
            concedió y por qué.
          </p>
        </div>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Acceso actual
          </h3>
          {concesiones.isLoading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : null}
          {concesiones.data?.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nadie tiene acceso concedido aquí. Quien lo ve, lo ve por su rol.
            </p>
          ) : null}
          <ul className="space-y-1">
            {(concesiones.data ?? []).map((concesion) => (
              <li
                key={concesion.id}
                className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-atlas-text">
                    {concesion.principalId}
                  </span>{" "}
                  <Badge tone="info">{concesion.nivel}</Badge>{" "}
                  {/* De dónde viene el acceso importa: una concesión heredada se quita en su carpeta,
                      no aquí, y sin decirlo el botón parecería roto. */}
                  {concesion.heredadaDe ? (
                    <span className="text-xs text-slate-500">
                      heredado de {concesion.heredadaDe}
                    </span>
                  ) : null}
                </span>
                {concesion.heredadaDe ? null : (
                  <Button
                    variant="ghost"
                    onClick={() => revocar.mutate(concesion.id)}
                    disabled={revocar.isPending}
                  >
                    Quitar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dar acceso
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-600">A quién</span>
              <select
                value={principalTipo}
                onChange={(evento) =>
                  setPrincipalTipo(
                    evento.target.value as "rol" | "usuario_interno",
                  )
                }
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="rol">Un rol</option>
                <option value="usuario_interno">Una persona</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-600">Nivel</span>
              <select
                value={nivel}
                onChange={(evento) => setNivel(evento.target.value as Nivel)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {NIVELES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {principalTipo === "rol" ? (
            <select
              value={principalId}
              onChange={(evento) => setPrincipalId(evento.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {ROLES_SUGERIDOS.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={principalId}
              onChange={(evento) => setPrincipalId(evento.target.value)}
              placeholder="Identificador del usuario interno"
            />
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600">Por qué</span>
            <textarea
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Queda en la bitácora del expediente."
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              disabled={
                !motivoValido ||
                principalId.trim().length === 0 ||
                conceder.isPending
              }
              onClick={() =>
                conceder.mutate(
                  {
                    principalTipo,
                    principalId: principalId.trim(),
                    nivel,
                    motivo: motivo.trim(),
                  },
                  { onSuccess: () => setMotivo("") },
                )
              }
            >
              Dar acceso
            </Button>
            <Button variant="secondary" onClick={onCerrar}>
              Cerrar
            </Button>
          </div>
          {!motivoValido && motivo.length > 0 ? (
            <p className="text-xs text-amber-700">
              El motivo necesita al menos ocho caracteres.
            </p>
          ) : null}
          {conceder.isError ? (
            <p className="text-xs text-red-700">
              No se pudo dar el acceso. No se puede conceder un nivel superior
              al propio.
            </p>
          ) : null}
        </section>
      </div>
    </DialogShell>
  );
}
