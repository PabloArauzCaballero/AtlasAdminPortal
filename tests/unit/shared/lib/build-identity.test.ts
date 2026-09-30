import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  readCommitFromGitDir,
  servedCommit,
} from "@/shared/lib/build-identity";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTRO = "fedcba9876543210fedcba9876543210fedcba98";

function gitFalso(opciones: { suelta?: string; empaquetada?: string }) {
  const dir = mkdtempSync(join(tmpdir(), "git-falso-"));
  const git = join(dir, ".git");
  mkdirSync(join(git, "refs", "heads"), { recursive: true });
  writeFileSync(join(git, "HEAD"), "ref: refs/heads/test\n");
  if (opciones.suelta)
    writeFileSync(join(git, "refs/heads/test"), `${opciones.suelta}\n`);
  writeFileSync(
    join(git, "packed-refs"),
    opciones.empaquetada
      ? `# pack-refs\n${opciones.empaquetada} refs/heads/test\n`
      : "",
  );
  return { dir, git };
}

describe("qué commit sirve el portal", () => {
  it("lee el commit de la referencia suelta y, si no está, de packed-refs", () => {
    expect(readCommitFromGitDir(gitFalso({ suelta: SHA }).git)).toBe(SHA);
    expect(readCommitFromGitDir(gitFalso({ empaquetada: SHA }).git)).toBe(SHA);
    expect(readCommitFromGitDir(gitFalso({}).git)).toBeNull();
    expect(readCommitFromGitDir("/no/existe")).toBeNull();
  });

  it("el sellado en la imagen manda sobre la variable vacía de Coolify", () => {
    const dir = mkdtempSync(join(tmpdir(), "build-info-"));
    const archivo = join(dir, "build-info.json");
    writeFileSync(archivo, JSON.stringify({ commit: SHA }));
    expect(servedCommit(archivo, "")).toBe(SHA);
    expect(servedCommit(archivo, OTRO)).toBe(SHA);
  });

  it("sin archivo usa la variable sólo si es un sha; nunca inventa", () => {
    expect(servedCommit("/no/existe.json", OTRO)).toBe(OTRO);
    expect(servedCommit("/no/existe.json", "")).toBeNull();
    expect(servedCommit("/no/existe.json", "local")).toBeNull();
  });

  it("el script del Dockerfile sella el commit de .git cuando SOURCE_COMMIT llega vacío", () => {
    const { dir } = gitFalso({ suelta: SHA });
    const script = resolve("scripts/write-build-info.mjs");
    execFileSync("node", [script, "build-info.json"], {
      cwd: dir,
      env: { ...process.env, SOURCE_COMMIT: "" },
    });
    const sellado = JSON.parse(
      readFileSync(join(dir, "build-info.json"), "utf8"),
    );
    expect(sellado.commit).toBe(SHA);

    execFileSync("node", [script, "build-info.json"], {
      cwd: dir,
      env: { ...process.env, SOURCE_COMMIT: OTRO },
    });
    expect(
      JSON.parse(readFileSync(join(dir, "build-info.json"), "utf8")).commit,
    ).toBe(OTRO);
  });
});
