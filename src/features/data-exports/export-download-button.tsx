"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { downloadCatalog } from "./download-catalog";

/** Descarga el catálogo entero y dice cuántas filas bajó, o por qué no pudo. */
export function ExportDownloadButton({
  downloadUrl,
  fileName,
}: Readonly<{ downloadUrl?: string | null; fileName: string }>) {
  const [estado, setEstado] = useState<
    | { tipo: "reposo" }
    | { tipo: "bajando" }
    | { tipo: "listo"; filas: number }
    | { tipo: "error"; mensaje: string }
  >({ tipo: "reposo" });

  const descargar = async () => {
    setEstado({ tipo: "bajando" });
    try {
      const filas = await downloadCatalog(downloadUrl, fileName);
      setEstado({ tipo: "listo", filas });
    } catch (error) {
      setEstado({
        tipo: "error",
        mensaje: isAtlasApiError(error)
          ? error.message
          : "No se pudo descargar. Intenta otra vez en unos segundos.",
      });
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={() => void descargar()}
        isLoading={estado.tipo === "bajando"}
        loadingText="Descargando…"
      >
        Descargar JSON
      </Button>
      {estado.tipo === "listo" ? (
        <p className="text-xs text-atlas-muted" role="status">
          Descargadas {formatNumber(estado.filas)} filas.
        </p>
      ) : null}
      {estado.tipo === "error" ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {estado.mensaje}
        </p>
      ) : null}
    </div>
  );
}
