import type { PaginatedResponse } from "@/shared/api/types";

/**
 * Un catálogo que se puede descargar entero. NO es una ejecución de exportación: Atlas no guarda
 * exportaciones, así que no hay estado, ni solicitante, ni fechas que mostrar. El backend lo dice en
 * su contrato (`GET /internal/exports`) y esta pantalla, hasta ahora, pintaba columnas de «Estado»,
 * «Solicitado por» y «Expira» siempre vacías y un «Procesando… el trabajo sigue» que nunca terminaba.
 */
export type DataExportSummary = {
  exportId: string;
  name: string;
  resourceType: string;
  resourceId: string | null;
  format: string;
  downloadUrl?: string | null;
  metadata?: { rows?: number; reason?: string } | null;
};

export type DataExportDetail = DataExportSummary & {
  reason: string | null;
  policySnapshot: { masking?: string; audit?: boolean } | null;
};

export type DataExportListResponse = PaginatedResponse<DataExportSummary>;
