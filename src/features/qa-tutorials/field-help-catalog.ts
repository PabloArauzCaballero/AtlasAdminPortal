/**
 * Catálogo de ayudas de campo (tooltips + texto guía + ejemplo). Centralizado
 * para reutilizar la misma explicación en formularios, tutoriales y validación.
 * Clave = identificador estable del campo (no su label, que puede cambiar).
 */
export type FieldHelp = Readonly<{
  key: string;
  label: string;
  /** Tooltip breve (una frase). */
  tooltip: string;
  /** Texto de ayuda ampliado bajo el campo. */
  help: string;
  /** Ejemplo concreto de valor válido. */
  example?: string;
}>;

const catalog: Record<string, FieldHelp> = {
  "suite.name": {
    key: "suite.name",
    label: "Nombre de la suite",
    tooltip: "Nombre reconocible de la funcionalidad que agrupa.",
    help: "Usa un nombre que cualquiera del equipo entienda sin abrir la suite. Describe la funcionalidad, no el detalle técnico.",
    example: "«Inicio de sesión» o «Alta de cliente»",
  },
  "suite.type": {
    key: "suite.type",
    label: "Tipo de prueba",
    tooltip: "Naturaleza de la suite (funcional, regresión, humo…).",
    help: "Elige del catálogo. Funcional verifica que algo hace lo correcto; regresión que no se rompió lo que ya funcionaba; humo un chequeo rápido de que lo básico responde.",
  },
  "suite.module": {
    key: "suite.module",
    label: "Módulo",
    tooltip: "Área de negocio a la que pertenece la suite.",
    help: "El módulo viene del catálogo del backend, para que las suites se agrupen igual que el resto del portal.",
  },
  "suite.environmentScope": {
    key: "suite.environmentScope",
    label: "Ambientes permitidos",
    tooltip: "Dónde puede ejecutarse esta suite.",
    help: "Restringe en qué ambientes es segura. Nunca escribes una URL: eliges ambientes ya definidos.",
  },
  "suite.isSafeForProduction": {
    key: "suite.isSafeForProduction",
    label: "Segura para producción",
    tooltip: "Marca sólo si NO altera datos reales.",
    help: "Actívala únicamente si la suite es de sólo lectura o usa datos sintéticos. En duda, déjala desmarcada.",
  },
  "case.expectedResult": {
    key: "case.expectedResult",
    label: "Resultado esperado",
    tooltip: "Qué debería ocurrir si todo funciona bien.",
    help: "Describe el comportamiento correcto. Este valor se compara con el resultado real durante la ejecución para decidir si el caso pasa.",
    example: "«El sistema permite el acceso y muestra el panel principal».",
  },
  "stress.virtualUsers": {
    key: "stress.virtualUsers",
    label: "Usuarios virtuales (VUs)",
    tooltip: "Cuántas peticiones simultáneas se generan.",
    help: "Simula usuarios concurrentes. Empieza bajo y sube gradualmente para encontrar el punto donde el endpoint se degrada.",
    example: "50 para un primer sondeo; 500 para una campaña.",
  },
  "stress.duration": {
    key: "stress.duration",
    label: "Duración",
    tooltip: "Cuánto tiempo se mantiene la carga.",
    help: "Una carga sostenida revela fugas o saturación que un pico corto no muestra.",
    example: "30s para una prueba rápida; 5m para sostenida.",
  },
  "stress.p95Threshold": {
    key: "stress.p95Threshold",
    label: "Umbral p95 (ms)",
    tooltip: "Tiempo máximo aceptable para el 95% de las respuestas.",
    help: "El p95 ignora los picos raros y mide la experiencia típica del peor 5%. Si se supera, el endpoint es demasiado lento bajo esa carga.",
    example: "800 ms es un umbral común para APIs de negocio.",
  },
  "endpoint.select": {
    key: "endpoint.select",
    label: "Endpoint",
    tooltip: "Qué endpoint del backend vas a probar.",
    help: "El catálogo sólo muestra endpoints reales marcados como testeables desde el portal, para que no pruebes algo inexistente.",
  },
};

export function fieldHelp(key: string): FieldHelp | undefined {
  return catalog[key];
}

export function allFieldHelp(): FieldHelp[] {
  return Object.values(catalog);
}
