"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { isSafeExternalUrl } from "@/shared/lib/urls";

export function ExportDownloadAction({
  downloadUrl,
  expiresAt,
}: Readonly<{ downloadUrl?: string | null; expiresAt?: string | null }>) {
  const [open, setOpen] = useState(false);
  if (!downloadUrl || !isSafeExternalUrl(downloadUrl)) return null;

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
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
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
