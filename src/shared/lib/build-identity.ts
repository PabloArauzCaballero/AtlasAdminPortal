import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Qué commit está sirviendo este contenedor.
 *
 * El smoke de TEST compara el commit que publica `/version` con el que se empujó a `test`, y salía
 * ROJO en cada despliegue: el compose de Coolify define `APP_COMMIT_SHA: '${SOURCE_COMMIT:-}'` y el
 * Coolify de Contabo no inyecta `SOURCE_COMMIT`, así que `/version` respondía `commit: ""`. El Core
 * tenía el mismo fallo y lo resolvió igual (`AtlasBackend/src/config/build-identity.ts`): el commit
 * se sella en la imagen al construir —del argumento o, si llega vacío, de `.git`— y la variable de
 * entorno sólo rellena lo que el archivo no trae. Nunca se inventa: sin dato, `null`.
 */
const COMMIT_SHA = /^[0-9a-f]{40}$/;

export function isCommitSha(value: unknown): value is string {
  return typeof value === "string" && COMMIT_SHA.test(value);
}

/** Lee el commit de `.git` sin el binario de git: HEAD, la referencia suelta o `packed-refs`. */
export function readCommitFromGitDir(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (isCommitSha(head)) return head;
    const ref = /^ref:\s*(\S+)$/.exec(head)?.[1];
    if (!ref) return null;
    try {
      const loose = readFileSync(join(gitDir, ref), "utf8").trim();
      if (isCommitSha(loose)) return loose;
    } catch {
      // la referencia puede estar sólo en packed-refs
    }
    for (const line of readFileSync(join(gitDir, "packed-refs"), "utf8").split(
      "\n",
    )) {
      const [sha, name] = line.trim().split(" ");
      if (name === ref && isCommitSha(sha)) return sha;
    }
    return null;
  } catch {
    return null;
  }
}

/** El commit sellado en la imagen; si no hay archivo o no es un sha, el de la variable; si no, null. */
export function servedCommit(
  buildInfoPath: string,
  fromEnv: string | undefined,
): string | null {
  try {
    const sealed = JSON.parse(readFileSync(buildInfoPath, "utf8")) as {
      commit?: unknown;
    };
    if (isCommitSha(sealed.commit)) return sealed.commit;
  } catch {
    // sin archivo (desarrollo local): se usa la variable
  }
  const env = fromEnv?.trim();
  return isCommitSha(env) ? env : null;
}
