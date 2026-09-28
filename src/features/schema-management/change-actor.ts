import type { SchemaChangeLog } from "./types";

/**
 * Permisos finos con los que una sesión interna propone y aprueba un cambio de esquema
 * (AtlasBackend, hallazgo A4 / P-35). El backend los exige; aquí sólo deciden si el botón se
 * ofrece, para no llevar a nadie a un 403.
 */
export const SCHEMA_PROPOSE_PERMISSION = "governance.schema.propose";
export const SCHEMA_APPROVE_PERMISSION = "governance.schema.approve";

/**
 * Quién propuso: desde A4 puede ser un usuario interno (lo normal desde este portal) o uno de
 * plataforma. El id sólo significa algo junto a su población: el interno #7 no es el de plataforma #7.
 */
export function requesterLabel(
  change: Pick<
    SchemaChangeLog,
    "requesterInternalUserId" | "requesterPlatformUserId"
  >,
): string {
  if (change.requesterInternalUserId)
    return `interno #${change.requesterInternalUserId}`;
  if (change.requesterPlatformUserId)
    return `plataforma #${change.requesterPlatformUserId}`;
  return "—";
}
