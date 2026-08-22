"use client";

import { useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { getApiBaseUrl } from "@/shared/api/config";
import { isSafeExternalUrl } from "@/shared/lib/urls";
import { resolveExportDownloadUrl } from "./download-url";
import { estadoDeExportacion } from "./export-lifecycle";

export function ExportDownloadAction({
  downloadUrl,
  expiresAt,
  status,
}: Readonly<{
  downloadUrl?: string | null;
  expiresAt?: string | null;
  /** Estado del trabajo. Sin él no se puede saber si el archivo sirve. */
  status?: string | null;
}>) {
  const [open, setOpen] = useState(false);
  // El backend da la ruta relativa al API; sin resolverla contra su origen el
  // navegador la buscaría en el portal, que no sirve /api/* (404).
  const resolvedUrl = resolveExportDownloadUrl(downloadUrl, getApiBaseUrl());
  if (!resolvedUrl || !isSafeExternalUrl(resolvedUrl)) return null;

  /*
   * Tener ruta NO basta para ofrecer la descarga.
   *
   * Un trabajo fallido que alcanzó a escribir su ruta antes de romperse enseñaba
   * «Abrir archivo» y devolvía un error del servidor; uno caducado enseñaba lo
   * mismo y hoy funcionaba y mañana daba un 403. En vez del botón se dice en qué
   * estado está y qué se puede hacer, que es lo único accionable.
   */
  const estado = estadoDeExportacion({ downloadUrl, expiresAt, status });
  if (estado.accion !== "descargar") {
    return (
      <p className="text-xs leading-5 text-atlas-muted" role="status">
        <strong className="text-atlas-text">{estado.label}.</strong>{" "}
        {estado.help}
      </p>
    );
  }

  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST} fallback={null}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Abrir archivo
      </Button>
      <ConfirmDialog
        open={open}
        title="Abrir exportación"
        description={buildDescription(expiresAt)}
        confirmText="Abrir archivo"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          window.open(resolvedUrl, "_blank", "noopener,noreferrer");
          setOpen(false);
        }}
      />
    </RoleGate>
  );
}

function buildDescription(expiresAt?: string | null) {
  const expiration = expiresAt ? ` Expira: ${expiresAt}.` : "";
  return `Esta descarga puede contener información sensible y debe quedar auditada por el servicio interno.${expiration}`;
}
