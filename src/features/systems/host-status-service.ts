import { apiRequest } from "@/shared/api/client";
import { isAtlasApiError } from "@/shared/api/errors";
import type { HostStatusReport } from "./types";

/**
 * Estado del servidor de TEST que mandó el informador. Un backend anterior a esta ruta contesta 404: para la
 * pantalla eso es «sin lectura del servidor», no un error. Así el portal sigue entero mientras el backend y el
 * portal se despliegan por separado.
 */
export async function getHostStatus(): Promise<HostStatusReport> {
  try {
    return await apiRequest<HostStatusReport>("/systems/monitor/host");
  } catch (error) {
    if (isAtlasApiError(error) && error.status === 404) {
      return { available: false };
    }
    throw error;
  }
}
