/**
 * Un día elegido en un `<input type="date">` (AAAA-MM-DD) como instante ISO, en la hora local de
 * quien mira: «desde el 3» es desde las 00:00 del 3 y «hasta el 5» es hasta el último milisegundo
 * del 5. Sin esto, «hasta el 5» terminaba a las 00:00 del 5 y se comía el día entero.
 */
export function inicioDelDia(fecha: string): string | undefined {
  if (!fecha) return undefined;
  const instante = new Date(`${fecha}T00:00:00`);
  return Number.isNaN(instante.getTime()) ? undefined : instante.toISOString();
}

export function finDelDia(fecha: string): string | undefined {
  if (!fecha) return undefined;
  const instante = new Date(`${fecha}T23:59:59.999`);
  return Number.isNaN(instante.getTime()) ? undefined : instante.toISOString();
}
