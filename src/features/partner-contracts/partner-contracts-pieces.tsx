"use client";

import { useId, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { usePublishContractTemplate } from "./hooks";

/**
 * Las piezas de la pantalla de contratos que no son la tabla: el diálogo de publicar y, en
 * `contract-columns.tsx`, las columnas. Salieron de `partner-contracts-page.tsx` porque la pantalla
 * pasaba de las 300 líneas que admite `yarn max-lines`.
 */
export function DialogoPublicar({
  open,
  codigoSugerido,
  onClose,
}: Readonly<{ open: boolean; codigoSugerido: string; onClose: () => void }>) {
  const titleId = useId();
  const publicar = usePublishContractTemplate();
  const [templateCode, setTemplateCode] = useState(codigoSugerido);
  const [name, setName] = useState("Contrato de afiliación de comercios");
  const [body, setBody] = useState("");

  if (!open) return null;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    await publicar.mutateAsync({
      templateCode: templateCode.trim().toUpperCase(),
      name: name.trim(),
      body,
      makeDefault: true,
    });
    onClose();
  }

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-2xl rounded-lg border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <form onSubmit={(evento) => void enviar(evento)} className="space-y-4">
        <h2 id={titleId} className="text-lg font-semibold text-atlas-text">
          Publicar una versión del contrato
        </h2>
        <p className="text-sm text-atlas-muted">
          Se crea una versión nueva y la anterior se archiva. El texto publicado
          NO se podrá editar: para corregirlo se publica otra versión, y la
          anterior queda como prueba de qué regía hasta hoy.
        </p>

        <Field
          tooltip="Identificador fijo del contrato entre versiones, en mayúsculas y sin espacios."
          label="Código del contrato"
          hint="En mayúsculas y sin espacios. Identifica el MISMO contrato entre versiones, así que no cambia al publicar una nueva."
        >
          <Input
            required
            value={templateCode}
            onChange={(evento) => setTemplateCode(evento.target.value)}
          />
        </Field>
        <Field
          tooltip="Nombre legible del contrato para el equipo y el comercio."
          label="Nombre"
        >
          <Input
            required
            value={name}
            onChange={(evento) => setName(evento.target.value)}
          />
        </Field>
        <Field
          tooltip="Texto íntegro que el comercio acepta al afiliarse, mínimo 50 caracteres."
          label="Texto del contrato"
          hint="Al menos 50 caracteres. Es lo que el comercio acepta al afiliarse."
        >
          <Textarea
            required
            rows={12}
            value={body}
            onChange={(evento) => setBody(evento.target.value)}
          />
        </Field>

        {publicar.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {isAtlasApiError(publicar.error)
              ? publicar.error.message
              : "No se pudo publicar la versión."}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={publicar.isPending}>
            Publicar
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
