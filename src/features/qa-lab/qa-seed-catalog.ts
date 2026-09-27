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

/**
 * Las semillas con nombre repiten SIEMPRE las mismas personas. Es lo que las hace útiles para
 * comparar dos corridas, y también lo que hace que una operación de ALTA (registrar cliente, crear
 * comercio) responda «ya existe» la segunda vez: el correo y el carnet son los de la primera.
 */
const REPEATS =
  " Repite las MISMAS personas cada vez: en operaciones de alta la segunda corrida chocará con «ya existe»; para eso usa «Personas nuevas».";

export const QA_SEED_CATALOG: readonly QaSeedEntry[] = [
  {
    seed: "qa-base",
    label: "Base",
    hint:
      "El lote de referencia, para comparar dos despliegues con la misma vara de medir." +
      REPEATS,
  },
  {
    seed: "qa-regresion",
    label: "Regresión",
    hint:
      "El lote que se repite en cada cambio: si hoy falla algo que ayer pasaba, lo rompió el cambio." +
      REPEATS,
  },
  {
    seed: "qa-frontera",
    label: "Frontera",
    hint: "Lote reservado para tandas con muchos casos en el límite." + REPEATS,
  },
  {
    seed: "qa-revision",
    label: "Revisión",
    hint:
      "El lote que se adjunta a una aprobación, para que quien revise repita la corrida tal cual." +
      REPEATS,
  },
];

/** Valor del selector que pide una semilla nueva en vez de una con nombre. */
export const NEW_PEOPLE_SEED = "__personas-nuevas__";

export const NEW_PEOPLE_HINT =
  "Genera una semilla única (qa-AAAAMMDD-HHMMSS) y con ella personas que nunca se usaron: sirve para las operaciones de alta. Copia la semilla si quieres repetir exactamente ese lote.";

/** Semilla única y legible: `qa-20260926-181502`. */
export function freshQaSeed(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `qa-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function isNamedQaSeed(seed: string): boolean {
  return QA_SEED_CATALOG.some((entry) => entry.seed === seed);
}

export function describeQaSeed(seed: string): string {
  const known = QA_SEED_CATALOG.find((entry) => entry.seed === seed);
  if (known) return known.hint;
  return `Semilla propia (${seed}): repite exactamente este lote de personas cada vez que la uses.`;
}

/** Opciones del selector: las semillas con nombre, «Personas nuevas» y, si aplica, la actual. */
export function qaSeedOptions(currentSeed: string) {
  const named = QA_SEED_CATALOG.map((entry) => ({
    value: entry.seed,
    label: entry.label,
    description: entry.hint,
  }));
  const current = isNamedQaSeed(currentSeed)
    ? []
    : [
        {
          value: currentSeed,
          label: `Semilla ${currentSeed}`,
          description: describeQaSeed(currentSeed),
        },
      ];
  return [
    ...named,
    ...current,
    {
      value: NEW_PEOPLE_SEED,
      label: "Personas nuevas",
      description: NEW_PEOPLE_HINT,
    },
  ];
}
