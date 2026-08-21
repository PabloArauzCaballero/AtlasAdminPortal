"use client";

import { useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
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
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
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
