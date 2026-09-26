/**
 * Los tipos de la consola de proveedores externos, repartidos por pantalla.
 *
 * Vivían todos en este archivo hasta que el tablero y las auditorías lo pasaron de 200 a 411
 * líneas y `yarn max-lines` (tope 300) lo rechazó. Se parte por pantalla, no por forma: quien
 * toca el tablero no necesita leer el bloque de credenciales.
 *
 * Este archivo sigue siendo la puerta de entrada: `import type { … } from "./types"` no cambia.
 */

export * from "./provider-types";
export * from "./dashboard-types";
export * from "./audit-types";
