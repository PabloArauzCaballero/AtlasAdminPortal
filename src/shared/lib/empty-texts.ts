/**
 * El texto de una tabla vacía, según POR QUÉ está vacía.
 *
 * Una tabla sin filas puede significar dos cosas que piden salidas distintas: que no hay datos
 * (esperar, o crearlos) o que los filtros no dejan pasar ninguno (quitarlos). Con un único texto
 * se le dice a quien filtró «aún no hay nada», que no es cierto, o a quien no filtró «quita los
 * filtros», que no tiene ninguno.
 */
export type EmptyCopy = { title: string; description: string };

const SIN_COINCIDENCIAS =
  "Quita o cambia los filtros de arriba para ver más registros.";

/**
 * Devuelve las dos props de `DataTable` (`emptyTitle`, `emptyDescription`), listas para esparcir.
 *
 * - `filtered`: hay algún filtro o búsqueda activos.
 * - `empty`: qué decir cuando de verdad no hay datos (qué es esta lista y cuándo aparecerán).
 * - `noMatchTitle`: cómo nombrar lo que no coincidió («Ninguna corrida coincide con los filtros.»).
 */
export function emptyTexts({
  filtered,
  empty,
  noMatchTitle,
}: Readonly<{
  filtered: boolean;
  empty: EmptyCopy;
  noMatchTitle: string;
}>): { emptyTitle: string; emptyDescription: string } {
  return filtered
    ? { emptyTitle: noMatchTitle, emptyDescription: SIN_COINCIDENCIAS }
    : { emptyTitle: empty.title, emptyDescription: empty.description };
}
