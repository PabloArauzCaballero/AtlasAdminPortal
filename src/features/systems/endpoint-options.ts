import type { Option } from "@/shared/lib/options";
import type { EndpointItem } from "./types";

/**
 * Un endpoint del catálogo como opción de un select.
 *
 * Un endpoint es una ENTIDAD: su descripción no se inventa, es su ficha. Si el catálogo trae el
 * propósito de negocio se enseña ése; si no, el módulo y el controlador que lo atienden, que es lo
 * que permite distinguir dos rutas parecidas.
 */
export function endpointOption(
  endpoint: Pick<
    EndpointItem,
    | "endpointId"
    | "method"
    | "fullPath"
    | "module"
    | "controllerName"
    | "handlerName"
    | "businessPurpose"
  >,
): Option {
  return {
    value: endpoint.endpointId,
    label: `${endpoint.method} ${endpoint.fullPath}`,
    description:
      endpoint.businessPurpose ??
      `${endpoint.module} · ${endpoint.controllerName}.${endpoint.handlerName}`,
  };
}
