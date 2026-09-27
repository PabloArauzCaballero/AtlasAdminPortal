"use client";

import Link from "next/link";
import { Badge } from "@/shared/components/ui/badges";
import { Card } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import type { SupportChannel } from "./types";
import { MessageCircle } from "lucide-react";

/**
 * Las conversaciones que llevo yo.
 *
 * Un chat que el reparto me asignó solo —con mi presencia en «Disponible»— salía de «en espera» y no
 * aparecía en ningún otro sitio: la consola sólo listaba lo que nadie había tomado. Aquí está lo que
 * ya es mío, con el enlace a la ficha donde se contesta.
 *
 * Sin conversaciones no se pinta nada: un «no tienes chats» encima de la bandeja es ruido para quien
 * sólo trabaja expedientes.
 */
export function MisConversaciones({
  canales,
}: Readonly<{ canales: SupportChannel[] }>) {
  if (canales.length === 0) return null;

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-atlas-muted" aria-hidden />
        <h2 className="text-sm font-semibold text-atlas-text">
          Mis conversaciones
        </h2>
        <Badge tone="info">{canales.length}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {canales.map((canal) => (
          <Card key={canal.channelId}>
            <div className="space-y-2 p-4">
              <p className="font-mono text-xs text-atlas-text">
                #{canal.channelId}
              </p>
              <p className="text-xs text-atlas-muted">
                Abierta {formatDateTime(canal.openedAt ?? canal.requestedAt)}
              </p>
              {canal.caseId ? (
                <Link
                  href={`/internal/support/cases/${canal.caseId}`}
                  className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-900 bg-slate-900 px-2 text-xs font-medium text-white hover:bg-slate-950"
                >
                  Abrir y responder
                </Link>
              ) : (
                <p className="text-xs text-amber-700">
                  Sin expediente (canal anterior al arreglo)
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
