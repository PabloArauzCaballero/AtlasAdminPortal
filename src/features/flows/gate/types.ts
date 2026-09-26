/** `GET /systems/flows/documentation-gate`: ¿se puede certificar la documentación de flujos hoy? */
export type DocumentationGateCheck = {
  code: string;
  passed: boolean;
  count: number;
  detail: string;
};

export type DocumentationGate = {
  passed: boolean;
  evaluatedAt: string;
  checks: DocumentationGateCheck[];
};
