/** Los tipos de decision que hoy delegan en el motor. Uno por consumidor real del backend. */
export type DecisionType = "identity" | "credit" | "risk";

/**
 * De donde salio el artefacto que se va a ejecutar.
 *
 * Se publica junto con el codigo porque «nadie ha elegido, se usa el entorno» y «alguien eligio
 * esto» son dos situaciones muy distintas para quien mira la pantalla — y hasta ahora se veian
 * igual: no se veian en absoluto.
 */
export type BindingSource = "binding" | "environment" | "unset";

export type DecisionArtifactBinding = {
  decisionType: DecisionType;
  artifactCode: string | null;
  source: BindingSource;
};

export type AvailableArtifact = {
  code: string;
  name: string | null;
  type: string | null;
};

export type DecisionArtifactsResponse = {
  bindings: DecisionArtifactBinding[];
  availableArtifacts: AvailableArtifact[];
};

export type AssignArtifactBody = {
  decisionType: DecisionType;
  artifactCode: string;
  notes?: string;
};
