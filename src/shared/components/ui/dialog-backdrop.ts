/**
 * Lo que le pasa al RESTO de la aplicación mientras hay un diálogo abierto.
 *
 * Un velo `fixed inset-0` tapa lo que hay detrás sólo si gana el orden de apilamiento, y aun
 * ganándolo deja dos puertas abiertas: la página de fondo se sigue desplazando con la rueda y sus
 * controles siguen existiendo para el teclado y para un lector de pantalla. En este portal eso se
 * notaba en la barra lateral —el sitio con más enlaces de la pantalla— y en la barra superior.
 *
 * `inert` cierra las dos de una vez: retira el subárbol del recorrido del teclado, del árbol de
 * accesibilidad y de los eventos de puntero, que es lo que significa «modal» de verdad. Se aplica
 * a los hermanos del velo, nunca al velo, y el bloqueo se lleva en una PILA porque los diálogos se
 * encadenan: el panel del archivo abre el de compartir encima, y al cerrar ese último el fondo
 * tiene que seguir inerte por el que queda debajo.
 */
const pila: HTMLElement[] = [];
let overflowPrevio: string | null = null;
let inertados: HTMLElement[] = [];

/** Bloquea el fondo mientras este velo esté montado. Devuelve cómo soltarlo. */
export function bloquearElFondo(velo: HTMLElement): () => void {
  pila.push(velo);
  aplicar();
  return () => {
    const posicion = pila.lastIndexOf(velo);
    if (posicion !== -1) pila.splice(posicion, 1);
    aplicar();
  };
}

function aplicar(): void {
  const cima = pila.at(-1) ?? null;

  // Se suelta siempre lo marcado antes: la cima puede haber cambiado, y lo que era el velo de
  // arriba ahora es fondo de otro.
  for (const elemento of inertados) elemento.removeAttribute("inert");
  inertados = [];

  if (!cima) {
    if (overflowPrevio !== null) {
      document.body.style.overflow = overflowPrevio;
      overflowPrevio = null;
    }
    return;
  }

  if (overflowPrevio === null) {
    overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  for (const hijo of Array.from(document.body.children)) {
    if (!(hijo instanceof HTMLElement) || hijo === cima) continue;
    // Lo que ya estaba inerte por su cuenta se deja como está: soltarlo al cerrar el diálogo sería
    // devolver al recorrido algo que nadie pidió devolver.
    if (hijo.hasAttribute("inert")) continue;
    hijo.setAttribute("inert", "");
    inertados.push(hijo);
  }
}
