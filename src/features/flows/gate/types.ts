/** `GET /systems/flows/documentation-gate`: ¿se puede certificar la documentación de flujos hoy? */
export type DocumentationGateCheck = {
  code: string;
  passed: boolean;
  /** `false`: falta cargar el artefacto del que depende y la cifra no dice nada. Ausente en backends anteriores. */
  measured?: boolean;
  count: number;
  detail: string;
};

export type DocumentationGate = {
  passed: boolean;
  /** `false`: en este entorno no se cargó ningún artefacto de Flujos. Ausente en backends anteriores. */
  artifactsLoaded?: boolean;
  evaluatedAt: string;
  checks: DocumentationGateCheck[];
};
