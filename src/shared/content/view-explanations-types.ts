export type ViewExplanation = {
  /** Qué hace la vista a nivel técnico: endpoints, datos y mecánica del sistema. */
  systems: string;
  /** Para qué le sirve al negocio: decisión o problema que resuelve. */
  business: string;
};

export type ModuleExplanation = {
  /** Nombre visible del módulo (coincide con la navegación). */
  module: string;
  /** Prefijos de ruta que pertenecen al módulo. */
  prefixes: string[];
  systems: string;
  business: string;
  /** Explicaciones por vista, keyed por prefijo de ruta (gana el match más largo). */
  views: Record<string, ViewExplanation>;
};
