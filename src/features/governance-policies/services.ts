import { apiRequest } from "@/shared/api/client";
import type { GovernancePolicyDetail } from "./types";

/**
 * Sólo lectura. `PATCH /internal/governance/policies/:id` lo retiró AtlasBackend porque devolvía
 * 200 sobre una escritura que no ocurría; el formulario de este portal siguió «guardando» y
 * redirigiendo como si hubiera persistido. La política se cambia por el paquete de gobierno
 * versionado, no editando una fila desde aquí.
 */
export function getGovernancePolicy(policyId: string) {
  return apiRequest<GovernancePolicyDetail>(
    `/internal/governance/policies/${policyId}`,
  );
}
