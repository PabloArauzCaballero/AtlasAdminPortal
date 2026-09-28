"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";

/** Lo mismo que exige el backend (`purgarSchema`): sin esto responde 400. */
export const MOTIVO_MINIMO = 8;
const FRASE = "VACIAR";

/**
 * Vaciar la papelera: motivo y confirmación en el MISMO diálogo.
 *
 * Antes el motivo se pedía con `window.prompt`, que aceptaba cualquier cosa; el backend exige al
 * menos ocho caracteres y respondía 400 sin que la pantalla dijera nada. Aquí el botón no se
 * habilita hasta que el motivo alcanza y la frase está escrita, y si el servidor aun así rechaza,
 * el motivo se pinta dentro del diálogo, que no se cierra.
 */
export function DialogoDeVaciarPapelera({
  abierto,
  enCurso,
  error,
  onConfirmar,
  onCancelar,
}: Readonly<{
  abierto: boolean;
  enCurso: boolean;
  error: string | null;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}>) {
  const tituloId = useId();
  const [motivo, setMotivo] = useState("");
  const [frase, setFrase] = useState("");

  useEffect(() => {
    if (abierto) {
      setMotivo("");
      setFrase("");
    }
  }, [abierto]);

  const motivoLimpio = motivo.trim();
  const motivoCorto = motivoLimpio.length < MOTIVO_MINIMO;
  const listo = !motivoCorto && frase.trim() === FRASE && !enCurso;

  return (
    <DialogShell
      open={abierto}
      labelledBy={tituloId}
      onClose={onCancelar}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-md animate-scale-in rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id={tituloId} className="text-base font-semibold text-atlas-text">
            Vaciar la papelera
          </h2>
          <p className="mt-1 text-sm text-atlas-muted">
            Borra DEFINITIVAMENTE del almacén los archivos de la papelera que
            nada más usa. Los que otro expediente o el Motor siguen usando se
            conservan. No se puede deshacer.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Field
          label="Por qué se vacía"
          tooltip="Queda registrado en la actividad del expediente junto a quién lo hizo."
          hint={`Al menos ${String(MOTIVO_MINIMO)} caracteres.`}
          error={
            motivo.length > 0 && motivoCorto
              ? `El motivo necesita al menos ${String(MOTIVO_MINIMO)} caracteres.`
              : undefined
          }
        >
          <Textarea
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            rows={2}
            maxLength={500}
          />
        </Field>
        <Field
          label={`Escribe «${FRASE}» para confirmar`}
          tooltip="Frase de seguridad: escribirla confirma que entiendes que el borrado es definitivo."
        >
          <Input
            value={frase}
            onChange={(evento) => setFrase(evento.target.value)}
            placeholder={FRASE}
            className="font-mono"
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancelar} disabled={enCurso}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!listo}
          isLoading={enCurso}
          loadingText="Vaciando…"
          onClick={() => onConfirmar(motivoLimpio)}
        >
          Vaciar
        </Button>
      </div>
    </DialogShell>
  );
}
