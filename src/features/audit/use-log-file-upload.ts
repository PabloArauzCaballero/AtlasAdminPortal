"use client";

import { useRef, useState } from "react";
import { formatNumber } from "@/shared/lib/format";

/**
 * Tope de lectura de un log subido. `file.text()` carga el archivo entero en
 * memoria y luego se renderiza: un log rotado de cientos de MB colgaba la
 * pestaña sin ningún aviso.
 */
export const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024;

/** Tope de líneas pintadas; el resto se descarta con aviso explícito. */
export const MAX_LOG_LINES = 5_000;

export type UploadedLog = { name: string; content: string };

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Decide qué hacer con un archivo de log antes de tocarlo. Está separado del
 * componente para poder probar los límites sin montar la pantalla entera.
 */
export function evaluateLogFile(
  file: { name: string; size: number },
  readContent: () => Promise<string>,
): Promise<{ log: UploadedLog | null; notice: string | null }> {
  // El tamaño se valida ANTES de leer: `file.text()` sobre un log de cientos
  // de MB cuelga la pestaña, y entonces ya no hay a quién avisar.
  if (file.size > MAX_LOG_FILE_BYTES) {
    return Promise.resolve({
      log: null,
      notice: `El archivo pesa ${formatMegabytes(file.size)} y el máximo es ${formatMegabytes(
        MAX_LOG_FILE_BYTES,
      )}. Recorta el log o filtra en el servidor.`,
    });
  }

  return readContent().then((content) => {
    const lines = content.split("\n");
    if (lines.length <= MAX_LOG_LINES) {
      return { log: { name: file.name, content }, notice: null };
    }
    return {
      log: {
        name: file.name,
        content: lines.slice(0, MAX_LOG_LINES).join("\n"),
      },
      notice: `Se muestran las primeras ${formatNumber(MAX_LOG_LINES)} líneas de ${formatNumber(
        lines.length,
      )}.`,
    };
  });
}

export function useLogFileUpload(onLoaded: () => void) {
  const [uploadedLog, setUploadedLog] = useState<UploadedLog | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await evaluateLogFile(file, () => file.text());
    setUploadedLog(result.log);
    setNotice(result.notice);
    if (result.log) onLoaded();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clear() {
    setUploadedLog(null);
    setNotice(null);
  }

  return { uploadedLog, notice, fileInputRef, loadFile, clear };
}
