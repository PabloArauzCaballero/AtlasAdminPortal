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
    // R1: enviar cookies/credenciales solo desde el cliente API y los runners
    // del QA Lab, que ya validan el host contra la allowlist antes del fetch.
    label: 'credentials: "include"',
    pattern: /credentials\s*:\s*(?:[^,\n]*\?\?\s*)?["']include["']/,
    allowed: new Set([
      "src/shared/api/request-init.ts",
      "src/features/qa-lab/direct-runner.ts",
      "src/features/qa-lab/stress-runner.ts",
    ]),
  },
  {
    label: "apertura de ventanas/descargas",
    pattern: /\bwindow\.open\s*\(/,
    allowed: new Set(["src/features/data-exports/export-download-action.tsx"]),
  },
];

/**
 * R12: un feature no debe importar los internals (hooks/services) de OTRO
 * feature — así cada uno se puede mover o testear sin arrastrar al vecino.
 *
 * Excepción: los "hubs de dominio". `systems` es el catálogo de endpoints/tablas
 * que consume medio portal, y `operations` es dueño de los dominios de calidad
 * de datos y risk-policy que otros features solo presentan. Importar de ellos es
 * consumir un dominio compartido, no acoplarse a un vecino. El resto de features
 * son hojas: importar sus hooks/services desde fuera es la regresión que se
 * bloquea aquí.
 */
const DOMAIN_HUB_FEATURES = new Set(["systems", "operations"]);

const CROSS_FEATURE_IMPORT =
  /from\s+["']@\/features\/([a-z0-9-]+)\/(hooks|services|stress-hooks|qa-hooks)["']/g;

function featureOf(relativePath) {
  const match = /^src\/features\/([a-z0-9-]+)\//.exec(relativePath);
  return match ? match[1] : null;
}

function findCrossFeatureViolations(relativePath, content) {
  const owner = featureOf(relativePath);
  if (!owner) return [];
  const found = [];
  for (const match of content.matchAll(CROSS_FEATURE_IMPORT)) {
    const target = match[1];
    if (target === owner || DOMAIN_HUB_FEATURES.has(target)) continue;
    found.push(
      `importa internals de @/features/${target} (usa la API pública del feature o un hub de dominio)`,
    );
  }
  return found;
}

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
  for (const label of findCrossFeatureViolations(relative, content)) {
    violations.push({ file: relative, label });
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
