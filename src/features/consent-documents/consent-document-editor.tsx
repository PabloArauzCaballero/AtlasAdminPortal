"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { isAtlasApiError } from "@/shared/api/errors";
import { useUpdateConsentDocument } from "./hooks";
import type { ConsentDocument } from "./types";

/**
 * El formulario para corregir el TEXTO de un documento de consentimiento.
 *
 * Se abre encima de la tabla al pulsar «Editar texto» en una fila. Se corrige el texto, nunca el
 * código ni la versión: aquí ni siquiera se ofrecen esos campos.
 */
export function ConsentDocumentEditor({
  document,
  onClose,
}: Readonly<{ document: ConsentDocument; onClose: () => void }>) {
  const mutation = useUpdateConsentDocument();
  const [title, setTitle] = useState(document.title ?? "");
  const [summary, setSummary] = useState(document.summary ?? "");
  const [body, setBody] = useState(document.bodyMarkdown ?? "");

  const save = () => {
    mutation.mutate(
      {
        id: document.id,
        body: { title, summary, bodyMarkdown: body },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card testId={`consent-document-${document.documentCode}`}>
      <CardContent>
        <div>
          <h3 className="text-base font-semibold text-atlas-text">
            Corrigiendo el texto del documento
          </h3>
          <p className="mt-1 font-mono text-xs text-atlas-muted">
            {document.documentCode} · versión {document.versionCode} ·{" "}
            {document.language}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Field
            tooltip="Nombre del documento legal tal como lo ve el cliente al aceptarlo."
            label="Título"
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid={`title-${document.documentCode}`}
            />
          </Field>

          <Field
            tooltip="Frase breve que explica al cliente de qué trata el documento."
            label="Resumen"
          >
            <Input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              data-testid={`summary-${document.documentCode}`}
            />
          </Field>

          <Field
            tooltip="Texto íntegro que acepta el cliente; aquí sólo se corrige la redacción."
            label="Texto del documento"
            hint="Se corrige la redacción, nunca el fondo: un cambio de fondo se publica como versión nueva."
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              data-testid={`body-${document.documentCode}`}
              className="font-mono text-xs leading-5"
            />
          </Field>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={save}
              isLoading={mutation.isPending}
              loadingText="Guardando…"
              disabled={title.trim().length < 3}
              data-testid={`save-${document.documentCode}`}
            >
              Guardar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>

          {mutation.error ? (
            <p className="text-xs font-medium text-red-600">
              {isAtlasApiError(mutation.error)
                ? mutation.error.message
                : "No pudimos guardar. Revisa el texto e intenta otra vez."}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
