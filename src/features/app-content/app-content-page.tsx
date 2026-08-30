"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useAppContent } from "./hooks";
import { EntryCard } from "./entry-card";
import type { ContentSurface } from "./types";

/**
 * Lo que el cliente lee en la app, editable sin desplegar.
 *
 * ## Por qué existe esta pantalla
 *
 * Porque el eslogan, los pasos de bienvenida, las preguntas frecuentes y el teléfono de soporte
 * estaban ESCRITOS EN EL CÓDIGO DE LA APP. Corregir una respuesta que confunde a la gente costaba
 * compilar, firmar y publicar en dos tiendas, y hasta que cada persona actualizara convivían dos
 * versiones distintas de lo que Atlas dice ser. Cuando el texto alcanza a las condiciones del
 * crédito, eso deja de ser un detalle de producto.
 *
 * ## Por qué los bullets se editan como lista y no como texto
 *
 * Porque en la app se pintan como lista: un icono por punto, una línea por idea y el punto
 * importante destacado. Si aquí se escribieran como párrafo con guiones, la app tendría que
 * interpretar texto libre para maquetar — y acabaría maquetando mal en cuanto alguien usara un
 * guion para otra cosa.
 */
const SURFACES: Array<{ value: ContentSurface; label: string; hint: string }> =
  [
    {
      value: "onboarding",
      label: "Bienvenida",
      hint: "Eslogan y pasos que se ven antes de registrarse",
    },
    {
      value: "faq",
      label: "Preguntas frecuentes",
      hint: "Las respuestas largas de la pantalla de ayuda",
    },
    {
      value: "help",
      label: "Ayuda y contacto",
      hint: "WhatsApp de soporte y acceso al recorrido guiado",
    },
    {
      value: "home",
      label: "Inicio",
      hint: "Avisos y mensajes de la pantalla principal",
    },
    {
      value: "legal",
      label: "Legal",
      hint: "Enlaces a términos y política de privacidad",
    },
    {
      value: "profile",
      label: "Perfil",
      hint: "Textos de la pantalla de perfil",
    },
    {
      value: "credit",
      label: "Crédito",
      hint: "Explicaciones de la línea y el puntaje",
    },
  ];

export function AppContentPage() {
  const [surface, setSurface] = useState<ContentSurface>("faq");
  const content = useAppContent(surface);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Contenido de la app"
        description="Todo lo que el cliente lee y no es un dato suyo. Se edita aquí y llega a la app sin publicar una versión."
      />

      <div
        className="mb-5 flex flex-wrap gap-2"
        data-testid="app-content-surfaces"
      >
        {SURFACES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSurface(option.value)}
            title={option.hint}
            data-testid={`surface-${option.value}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              surface === option.value
                ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {content.isLoading ? <LoadingSkeleton rows={4} /> : null}

      {content.error ? (
        <ErrorState
          title="No pudimos cargar el contenido"
          description="Reintenta en unos segundos."
        />
      ) : null}

      {content.data ? (
        <div className="flex flex-col gap-4" data-testid="app-content-list">
          {content.data.items.map((entry) => (
            <EntryCard
              key={entry.contentId}
              entry={entry}
              editing={editing === entry.contentId}
              onEdit={() => setEditing(entry.contentId)}
              onClose={() => setEditing(null)}
            />
          ))}
          {content.data.items.length === 0 ? (
            <p className="text-sm text-slate-400">
              Todavía no hay contenido para esta pantalla. La app usará sus
              textos por defecto.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
