/**
 * Graba respuestas REALES del generador de datos de prueba del mock para el E2E del CI.
 *
 * El E2E corre en un runner que no puede clonar `AtlasExternalProvidersMock` (repo privado), así
 * que `scripts/qa-fakers-fixture-server.mjs` sirve estas respuestas en su lugar. No se escriben a
 * mano: se regeneran con el mock de verdad cada vez que cambien sus fakers.
 *
 *   MOCK_URL=http://127.0.0.1:4010 node scripts/record-qa-fakers-fixtures.mjs
 */
import { writeFile } from "node:fs/promises";

const MOCK_URL = (process.env.MOCK_URL ?? "http://127.0.0.1:4010").replace(
  /\/+$/,
  "",
);
const OUT = new URL("../tests/e2e/fixtures/qa-fakers.json", import.meta.url);
const SEED = "qa-e2e";
const COUNT = 60;
const TYPES = ["caso", "monto"];
const VARIANTS = ["valido", "frontera", "invalido"];

async function get(path, init) {
  const response = await fetch(`${MOCK_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`${path} → ${response.status} ${await response.text()}`);
  }
  return response.json();
}

const catalog = await get("/mock/fakers");
const batches = {};
for (const type of TYPES) {
  batches[type] = {};
  for (const variant of VARIANTS) {
    batches[type][variant] = await get(`/mock/fakers/${type}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seed: SEED, count: COUNT, variant }),
    });
  }
}

await writeFile(
  OUT,
  `${JSON.stringify({ recordedFrom: MOCK_URL, seed: SEED, catalog, batches })}\n`,
);
console.log(
  `Grabado ${OUT.pathname}: ${TYPES.length} tipos × ${VARIANTS.length} variantes.`,
);
