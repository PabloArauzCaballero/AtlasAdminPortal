"use client";

import { useState } from "react";
import {
  useConsentDocuments,
  useUpdateConsentDocument,
} from "./hooks";
import type { ConsentDocument } from "./types";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
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
        eyebrow="Configuración"
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
        <div className="flex flex-col gap-4" data-testid="consent-documents-list">
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
            <p className="text-sm text-slate-400">
              Todavía no hay documentos publicados.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function statusTone(status: string | null): string {
  if (status === "published") return "bg-emerald-500/15 text-emerald-300";
  if (status === "retired") return "bg-slate-500/15 text-slate-300";
  return "bg-amber-500/15 text-amber-300";
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
    <section
      className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
      data-testid={`consent-document-${document.documentCode}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {document.title ?? document.documentCode}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {document.documentCode} · versión {document.versionCode} ·{" "}
            {document.language}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(document.status)}`}
          >
            {document.status}
          </span>
          {!editing ? (
            <Button onClick={onEdit} data-testid={`edit-${document.documentCode}`}>
              Editar texto
            </Button>
          ) : null}
        </div>
      </div>

      {!editing ? (
        <>
          {document.summary ? (
            <p className="mt-3 text-sm text-slate-300">{document.summary}</p>
          ) : null}
          {/*
            El cuerpo se muestra recortado. Quien administra necesita reconocer el documento de un
            vistazo; leerlo entero es lo que hace el modo edición, donde además se puede corregir.
          */}
          <pre className="mt-3 max-h-32 overflow-hidden whitespace-pre-wrap text-xs text-slate-400">
            {document.bodyMarkdown ?? "(sin texto)"}
          </pre>
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Título
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid={`title-${document.documentCode}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Resumen
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              data-testid={`summary-${document.documentCode}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Texto del documento
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              data-testid={`body-${document.documentCode}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
            />
          </label>

          <div className="flex items-center gap-2">
            <Button
              onClick={save}
              disabled={mutation.isPending || title.trim().length < 3}
              data-testid={`save-${document.documentCode}`}
            >
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button onClick={onClose}>Cancelar</Button>
          </div>

          {mutation.error ? (
            <p className="text-xs text-rose-300">
              No pudimos guardar. Revisa el texto e intenta otra vez.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
