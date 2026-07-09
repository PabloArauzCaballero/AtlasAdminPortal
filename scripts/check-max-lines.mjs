import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const maxLines = Number(process.argv[2] ?? 300);
const includedExtensions = new Set([".ts", ".tsx"]);
const ignoredDirs = new Set([
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "out",
]);
const ignoredFiles = new Set(["next-env.d.ts"]);

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    if (entry.isFile() && isIncluded(entry.name)) files.push(absolute);
  }
  return files;
}

function isIncluded(fileName) {
  return (
    includedExtensions.has(path.extname(fileName)) &&
    !ignoredFiles.has(fileName)
  );
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

const files = await listFiles(path.join(root, "src"));
const violations = [];

for (const file of files) {
  const lines = countLines(await readFile(file, "utf8"));
  if (lines > maxLines) {
    violations.push({ file: path.relative(root, file), lines });
  }
}

if (violations.length) {
  console.error(`Archivos sobre ${maxLines} líneas:`);
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.lines}`);
  }
  process.exit(1);
}

console.log(`OK: ningún archivo TS/TSX en src supera ${maxLines} líneas.`);
