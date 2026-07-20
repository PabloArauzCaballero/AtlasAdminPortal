"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { getApiBaseUrl } from "@/shared/api/config";
import { isSafeExternalUrl } from "@/shared/lib/urls";
import { resolveExportDownloadUrl } from "./download-url";

export function ExportDownloadAction({
  downloadUrl,
  expiresAt,
}: Readonly<{ downloadUrl?: string | null; expiresAt?: string | null }>) {
  const [open, setOpen] = useState(false);
  // El backend da la ruta relativa al API; sin resolverla contra su origen el
  // navegador la buscaría en el portal, que no sirve /api/* (404).
  const resolvedUrl = resolveExportDownloadUrl(downloadUrl, getApiBaseUrl());
  if (!resolvedUrl || !isSafeExternalUrl(resolvedUrl)) return null;

  return (
    <PermissionGate permissions={["internal.exports.download"]} fallback={null}>
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
    </PermissionGate>
  );
}

function buildDescription(expiresAt?: string | null) {
  const expiration = expiresAt ? ` Expira: ${expiresAt}.` : "";
  return `Esta descarga puede contener información sensible y debe quedar auditada por el servicio interno.${expiration}`;
}
