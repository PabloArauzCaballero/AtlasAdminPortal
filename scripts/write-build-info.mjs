// Sella en la imagen el commit que se está construyendo (ver src/shared/lib/build-identity.ts).
// Lo corre el Dockerfile después de `yarn build`: SOURCE_COMMIT si llega, si no `.git`, si no null.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SHA = /^[0-9a-f]{40}$/;

function fromGit(gitDir) {
  try {
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (SHA.test(head)) return head;
    const ref = /^ref:\s*(\S+)$/.exec(head)?.[1];
    if (!ref) return null;
    try {
      const loose = readFileSync(join(gitDir, ref), "utf8").trim();
      if (SHA.test(loose)) return loose;
    } catch {
      // puede estar sólo en packed-refs
    }
    for (const line of readFileSync(join(gitDir, "packed-refs"), "utf8").split(
      "\n",
    )) {
      const [sha, name] = line.trim().split(" ");
      if (name === ref && SHA.test(sha)) return sha;
    }
    return null;
  } catch {
    return null;
  }
}

const out = resolve(process.argv[2] ?? "build-info.json");
const arg = process.env.SOURCE_COMMIT?.trim();
const commit = SHA.test(arg ?? "") ? arg : fromGit(resolve(".git"));
writeFileSync(
  out,
  `${JSON.stringify({ commit, builtAt: new Date().toISOString() }, null, 2)}\n`,
);
console.log(`build-info: commit=${commit ?? "NO DETERMINADO"} -> ${out}`);
