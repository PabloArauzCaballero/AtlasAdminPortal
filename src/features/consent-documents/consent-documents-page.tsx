"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { useConsentDocuments, useUpdateConsentDocument } from "./hooks";
import type { ConsentDocument } from "./types";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";

/**
 * El texto que el cliente acepta, editable sin desplegar.
 *
 * ## Por qué existe esta pantalla
 *
 * Hasta ahora el consentimiento vivía a medias: la base guardaba el código, la versión y una URL,
 * y el título lo adivinaba la app móvil a partir del código. Cambiar una palabra de la política de
 * privacidad exigía tocar el teléfono, así que en la práctica nadie la corregía nunca.
 *
 * ## La regla que gobierna la edición
 *
 * Se corrige el TEXTO, nunca el código ni la versión. Quien aceptó bajo la v1 tiene derecho a que
 * la v1 siga diciendo lo que leyó; un cambio de fondo se publica como versión nueva y vuelve a
 * pedirse la aceptación. El backend lo impone, y aquí ni siquiera se ofrecen esos campos.
 */
export function ConsentDocumentsPage() {
  const documents = useConsentDocuments();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        icon={FileText}
        eyebrow="Gobierno y calidad"
        title="Documentos de consentimiento"
        description="Lo que el cliente acepta al registrarse. El texto se edita aquí y llega a la app sin desplegar nada."
      />

      {documents.isLoading ? <LoadingSkeleton rows={5} /> : null}

      {documents.error ? (
        <ErrorState
          title="No pudimos cargar los documentos"
          description="Reintenta en unos segundos."
        />
      ) : null}

      {documents.data ? (
        <div
          className="flex flex-col gap-4"
          data-testid="consent-documents-list"
        >
          {documents.data.items.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              editing={editing === document.id}
              onEdit={() => setEditing(document.id)}
              onClose={() => setEditing(null)}
            />
          ))}
          {documents.data.items.length === 0 ? (
            <EmptyState
              title="Todavía no hay documentos publicados"
              description="Cuando se publique un consentimiento aparecerá aquí para poder corregir su texto."
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * El estado se pinta con el tono del sistema, no con un color inventado por la pantalla.
 *
 * `published` es lo que el cliente está aceptando ahora mismo y por eso va en verde; `retired`
 * describe algo que ya no se ofrece y se apaga en gris; cualquier otro estado —un borrador— avisa
 * en ámbar de que hay texto escrito que todavía no rige.
 */
function statusTone(status: string | null): "success" | "muted" | "warning" {
  if (status === "published") return "success";
  if (status === "retired") return "muted";
  return "warning";
}

function DocumentCard({
  document,
  editing,
  onEdit,
  onClose,
}: Readonly<{
  document: ConsentDocument;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
}>) {
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-atlas-text">
              {document.title ?? document.documentCode}
            </h3>
            <p className="mt-1 font-mono text-xs text-atlas-muted">
              {document.documentCode} · versión {document.versionCode} ·{" "}
              {document.language}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(document.status)}>
              {document.status ?? "sin estado"}
            </Badge>
            {!editing ? (
              <Button
                variant="secondary"
                onClick={onEdit}
                data-testid={`edit-${document.documentCode}`}
              >
                Editar texto
              </Button>
            ) : null}
          </div>
        </div>

        {!editing ? (
          <>
            {document.summary ? (
              <p className="mt-3 text-sm leading-6 text-atlas-text">
                {document.summary}
              </p>
            ) : null}
            {/*
              El cuerpo se muestra recortado. Quien administra necesita reconocer el documento de un
              vistazo; leerlo entero es lo que hace el modo edición, donde además se puede corregir.

              El recorte se DEGRADA en vez de cortarse a hachazos: el degradado sobre el borde
              inferior dice que el texto sigue. Con `overflow-hidden` a secas la última línea
              quedaba partida por la mitad y parecía un fallo de renderizado.
            */}
            <div className="relative mt-3">
              <pre className="max-h-32 overflow-hidden whitespace-pre-wrap rounded-lg border border-atlas-border bg-atlas-soft p-3 font-mono text-xs leading-5 text-atlas-muted">
                {document.bodyMarkdown ?? "(sin texto)"}
              </pre>
              <div className="pointer-events-none absolute inset-x-px bottom-px h-10 rounded-b-lg bg-gradient-to-t from-atlas-soft to-transparent" />
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Título">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                data-testid={`title-${document.documentCode}`}
              />
            </Field>

            <Field label="Resumen">
              <Input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                data-testid={`summary-${document.documentCode}`}
              />
            </Field>

            <Field
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
                No pudimos guardar. Revisa el texto e intenta otra vez.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
