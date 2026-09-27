/**
 * Sustituto del generador de datos de prueba del mock SÓLO para el E2E del CI.
 *
 * El runner no puede clonar `AtlasExternalProvidersMock` (repo privado). Este servidor responde las
 * mismas rutas (`/mock/fakers`, `GET|POST /mock/fakers/:tipo`) con respuestas GRABADAS del mock real
 * (`scripts/record-qa-fakers-fixtures.mjs`), así el E2E recorre el camino verdadero del portal
 * —navegador → `/api/qa-fakers` → reenvío del servidor— y no un atajo.
 *
 * Lo que NO reproduce: la semilla. Cualquier semilla recibe el lote grabado (recortado a `count`),
 * y la respuesta lo dice con `recordedFixture: true`.
 *
 *   QA_FAKERS_FIXTURE_PORT=4010 node scripts/qa-fakers-fixture-server.mjs
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const port = Number(process.env.QA_FAKERS_FIXTURE_PORT ?? 4010);
const fixtures = JSON.parse(
  readFileSync(
    new URL("../tests/e2e/fixtures/qa-fakers.json", import.meta.url),
    "utf8",
  ),
);

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function batchFor(type, raw) {
  const variant = raw.variant || "valido";
  const recorded = fixtures.batches[type]?.[variant];
  if (!recorded) return null;
  const count = Math.max(
    1,
    Math.min(Number(raw.count) || 1, recorded.items.length),
  );
  return {
    ...recorded,
    seed: raw.seed || recorded.seed,
    count,
    items: recorded.items.slice(0, count),
    recordedFixture: true,
  };
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://fixture.invalid");
  if (url.pathname === "/health") return send(res, 200, { ok: true });
  if (url.pathname === "/mock/fakers" && req.method === "GET") {
    return send(res, 200, { ...fixtures.catalog, recordedFixture: true });
  }
  const match = /^\/mock\/fakers\/([A-Za-z0-9]+)$/.exec(url.pathname);
  if (!match || (req.method !== "GET" && req.method !== "POST")) {
    return send(res, 404, { ok: false, error: "ROUTE_NOT_FOUND" });
  }
  const answer = (raw) => {
    const batch = batchFor(match[1], raw);
    if (!batch) {
      return send(res, 404, {
        ok: false,
        error: "UNKNOWN_FAKER",
        detail: `El fixture del CI no tiene «${match[1]}».`,
      });
    }
    return send(res, 200, batch);
  };
  if (req.method === "GET") {
    return answer(Object.fromEntries(url.searchParams));
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      answer(body ? JSON.parse(body) : {});
    } catch {
      send(res, 400, { ok: false, error: "INVALID_JSON" });
    }
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`[qa-fakers-fixture] http://127.0.0.1:${port}`);
});
