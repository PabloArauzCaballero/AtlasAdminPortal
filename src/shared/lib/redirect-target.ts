/**
 * Destino de una ruta vieja que se fusionó en otra, con sus parámetros intactos.
 *
 * Una fusión de pantallas no puede dejar 404 en marcadores ni enlaces profundos, y un enlace que
 * llevaba `?status=…` tiene que llegar con él. `alias` traduce nombres de parámetro cuando la
 * pantalla nueva los llama distinto; los valores no se tocan.
 */
export type RedirectSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function redirectTarget(
  target: string,
  searchParams: RedirectSearchParams = {},
  alias: Record<string, string> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
    for (const value of values) query.append(alias[key] ?? key, value);
  }
  const text = query.toString();
  return text ? `${target}?${text}` : target;
}
