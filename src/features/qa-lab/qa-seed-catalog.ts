/**
 * Semillas con NOMBRE, en vez de un campo de texto libre.
 *
 * Es la misma idea que el QA Lab del motor de decisión (`seed-catalog.ts` allí), traída a las
 * pruebas de endpoint: una semilla no es un ajuste, es el nombre de un lote concreto de casos. La
 * misma semilla sobre el mismo contrato vuelve a producir exactamente las mismas entradas, y ahí
 * está todo su valor — comparar dos ejecuciones con el mismo lote, o reproducir semanas después el
 * caso que falló. Tecleada a mano no sirve para nada de eso: cada persona escribe una cadena
 * distinta, así que dos corridas nunca son comparables y nadie sabe cuál repetir.
 *
 * Lo que la semilla NO promete: el lote depende también del contrato del endpoint. `qa-base` sobre
 * dos versiones del catálogo con campos distintos da casos distintos. Es lo correcto —no se puede
 * generar un campo que el contrato no declara— pero conviene saberlo antes de comparar dos informes.
 */
export type QaSeedEntry = {
  seed: string;
  label: string;
  hint: string;
};

export const QA_SEED_CATALOG: readonly QaSeedEntry[] = [
  {
    seed: "qa-base",
    label: "Base",
    hint: "El lote de referencia. Úsalo para comparar dos despliegues del mismo endpoint: mismo lote, misma vara de medir.",
  },
  {
    seed: "qa-regresion",
    label: "Regresión",
    hint: "El lote que se repite en cada cambio. Si hoy falla algo que ayer pasaba, lo rompió el cambio y no el azar.",
  },
  {
    seed: "qa-frontera",
    label: "Frontera",
    hint: "El lote reservado para las tandas con mucho caso límite: cadenas vacías, máximos, cero, negativos.",
  },
  {
    seed: "qa-revision",
    label: "Revisión",
    hint: "El lote que se adjunta a una aprobación, para que quien revise pueda repetir la corrida tal cual.",
  },
];

export function describeQaSeed(seed: string): string {
  const known = QA_SEED_CATALOG.find((entry) => entry.seed === seed);
  if (known) return known.hint;
  return "Semilla propia. Repite el mismo lote de casos sobre este contrato.";
}
