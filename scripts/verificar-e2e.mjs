#!/usr/bin/env node
/**
 * Falla si la corrida de E2E se saltó pruebas sin declararlo.
 *
 * Por qué existe: el 2026-09-18 el workflow E2E de este repositorio ejecutó **136 pruebas, saltó
 * 134 y pasó 1**, y GitHub lo marcó `success`. Faltaban los secretos `TEST_EMAIL`/`TEST_PASSWORD`,
 * así que cada `test.skip` se disparaba y la suite entera se evaporaba en silencio. Un E2E que se
 * salta se lee en CI exactamente igual que un E2E que pasa, que es el peor de los dos fallos
 * posibles: durante meses el portal figuró cubierto sin estarlo.
 *
 * `playwright test --reporter=json` deja el resultado en un archivo; esto lo lee y exige que el
 * porcentaje de pruebas saltadas no supere el tope. En una corrida bien configurada ese número es
 * cero; el tope existe para los saltos legítimos por navegador.
 *
 *   node scripts/verificar-e2e.mjs test-results/results.json [tope-en-porcentaje]
 */
import { readFileSync } from "node:fs";

const [, , ruta = "test-results/results.json", topeCrudo = "10"] = process.argv;
const tope = Number(topeCrudo);

let informe;
try {
  informe = JSON.parse(readFileSync(ruta, "utf8"));
} catch (error) {
  console.error(
    `No se pudo leer el informe de Playwright en ${ruta}: ${String(error)}`,
  );
  console.error(
    "Sin informe no se puede afirmar que la suite corrió. Se falla a propósito.",
  );
  process.exit(1);
}

const estados = new Map();
const saltadas = [];
const recorrer = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const prueba of spec.tests ?? []) {
      const estado = prueba.status ?? "desconocido";
      estados.set(estado, (estados.get(estado) ?? 0) + 1);
      if (estado === "skipped") {
        const motivo = prueba.results?.[0]?.error?.message ?? spec.title;
        saltadas.push(`${spec.file ?? ""} › ${spec.title} — ${motivo}`);
      }
    }
  }
  for (const hija of suite.suites ?? []) recorrer(hija);
};
for (const suite of informe.suites ?? []) recorrer(suite);

const total = [...estados.values()].reduce((suma, n) => suma + n, 0);
const nSaltadas = estados.get("skipped") ?? 0;
const porcentaje =
  total === 0 ? 100 : Math.round((nSaltadas / total) * 1000) / 10;

console.log(
  `Pruebas: ${total} · ${[...estados].map(([k, v]) => `${k}=${v}`).join(" · ")}`,
);
console.log(`Saltadas: ${nSaltadas} (${porcentaje} %), tope ${tope} %`);

if (total === 0) {
  console.error(
    "\nLa corrida no ejecutó NINGUNA prueba. Eso no es un verde, es una suite que no arrancó.",
  );
  process.exit(1);
}
if (porcentaje > tope) {
  console.error(
    `\nDemasiadas pruebas saltadas (${porcentaje} % > ${tope} %). Las primeras:`,
  );
  for (const linea of saltadas.slice(0, 15)) console.error(`  · ${linea}`);
  console.error(
    "\nSi es por credenciales, configura TEST_EMAIL y TEST_PASSWORD como secretos del repositorio,\n" +
      "y PW_PIN_INBOX_PORT con el backend arrancado desde docker-compose.pin-inbox.yml.",
  );
  process.exit(1);
}
console.log("\nOK: la suite corrió de verdad.");
