"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "@/shared/components/ui/tooltip";

/**
 * Copiar la tabla entera al portapapeles, tal y como se ve.
 *
 * Se lee del DOM y no de `data` a propósito: lo que interesa pegar en una hoja de cálculo o en un
 * ticket es lo que la pantalla muestra —la fecha ya formateada, la etiqueta del estado en
 * castellano—, no el JSON crudo del que salió. Va separado por tabuladores porque es el formato
 * que Excel, Sheets y Numbers pegan en columnas sin preguntar nada.
 *
 * Se saltan las columnas sin cabecera: son las de acciones, y su texto («Renombrar», «A la
 * papelera») no es un dato de la fila.
 */
export function BotonCopiarTabla({
  tablaRef,
}: Readonly<{ tablaRef: React.RefObject<HTMLTableElement | null> }>) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    const tabla = tablaRef.current;
    if (!tabla) return;

    const cabeceras = [...tabla.querySelectorAll("thead th")].map(textoDe);
    const columnas = cabeceras
      .map((texto, indice) => (texto.length > 0 ? indice : -1))
      .filter((indice) => indice >= 0);
    if (columnas.length === 0) return;

    const filas = [...tabla.querySelectorAll("tbody tr")].map((fila) => {
      const celdas = [...fila.querySelectorAll("td")];
      return columnas.map((indice) => textoDe(celdas[indice])).join("\t");
    });

    const tsv = [columnas.map((i) => cabeceras[i]).join("\t"), ...filas].join(
      "\n",
    );
    void navigator.clipboard.writeText(tsv).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  return (
    <Tooltip text="Copia la tabla entera al portapapeles, en columnas separadas por tabulador: se pega directo en una hoja de cálculo.">
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-2 py-1 text-xs text-atlas-muted transition-colors hover:border-slate-300 hover:text-atlas-text"
      >
        {copiado ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </Tooltip>
  );
}

/** El texto visible de una celda, en una sola línea y sin los espacios del marcado. */
function textoDe(elemento: Element | undefined): string {
  return (elemento?.textContent ?? "").replace(/\s+/g, " ").trim();
}
