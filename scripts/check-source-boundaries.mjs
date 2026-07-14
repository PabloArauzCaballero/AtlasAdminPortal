import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const checks = [
  {
    label: "fetch directo",
    pattern: /\bfetch\s*\(/,
    allowed: new Set(["src/shared/api/transport.ts"]),
  },
  {
    label: "storage del navegador",
    pattern: /\b(?:localStorage|sessionStorage)\b/,
    allowed: new Set([
      "src/shared/auth/session-storage.ts",
      "src/shared/lib/local-search-history.ts",
    ]),
  },
  {
    label: "dangerouslySetInnerHTML",
    pattern: /dangerouslySetInnerHTML/,
    allowed: new Set(),
  },
  {
    label: "apertura de ventanas/descargas",
    pattern: /\bwindow\.open\s*\(/,
    allowed: new Set(["src/features/data-exports/export-download-action.tsx"]),
  },
];

async function listSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listSourceFiles(absolute)));
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

const violations = [];
for (const absolute of await listSourceFiles(srcRoot)) {
  const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
  const content = await readFile(absolute, "utf8");
  for (const check of checks) {
    if (check.pattern.test(content) && !check.allowed.has(relative)) {
      violations.push({ file: relative, label: check.label });
    }
  }
}

if (violations.length > 0) {
  console.error("Violaciones de límites de arquitectura:");
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.label}`);
  }
  process.exit(1);
}

console.log("OK: límites de arquitectura de frontend respetados.");
