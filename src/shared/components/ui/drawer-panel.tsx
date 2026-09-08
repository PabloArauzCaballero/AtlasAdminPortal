"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { DialogShell } from "./dialog-shell";
import { Tooltip } from "./tooltip";

export function DrawerPanel({
  open,
  title,
  children,
  onClose,
}: Readonly<{
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}>) {
  const titleId = useId();
  return (
    <DialogShell
      open={open}
      labelledBy={titleId}
      onClose={onClose}
      // El drawer es de consulta, no confirma nada destructivo: cerrar tocando
      // fuera es el gesto esperado.
      closeOnBackdrop
      // El panel se pega a la derecha; el velo, el desenfoque y el apilamiento son del shell.
      overlayClassName="block"
      panelClassName="atlas-scrollbar ml-auto h-full w-full max-w-xl animate-drawer-in overflow-auto border-l border-atlas-border bg-white shadow-card"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-atlas-border bg-white px-5 py-4">
        <h2 id={titleId} className="text-sm font-semibold text-atlas-text">
          {title}
        </h2>
        <Tooltip text="Cierra el panel. Lo que no hayas guardado se pierde.">
          <Button
            variant="ghost"
            className="h-8 w-8 px-0"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
      <div className="p-5">{children}</div>
    </DialogShell>
  );
}
