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
  /** Version fijada. `null` = se sigue la vigente del despliegue. */
  pinnedVersion?: string | null;
  /** Que endpoints del backend disparan esta decision: «si cambio esto, que se rompe». */
  consumerEndpoints?: { method: string; path: string; purpose: string }[];
  /** En que punto del recorrido del cliente ocurre. */
  workflowStage?: string | null;
  /** Los pasos del recorrido en los que participa, en orden. */
  workflowSteps?: string[];
  title?: string;
  description?: string | null;
  /** Para que le sirve al negocio. */
  business?: string;
  /** Que hace por dentro. */
  systems?: string;
  /** Un caso concreto donde se ve la diferencia. */
  example?: string;
};

export type AvailableArtifact = {
  code: string;
  name: string | null;
  type: string | null;
  latestVersion: string | null;
  status: string | null;
};

export type DecisionArtifactsResponse = {
  bindings: DecisionArtifactBinding[];
  availableArtifacts: AvailableArtifact[];
};

export type AssignArtifactBody = {
  decisionType: DecisionType;
  artifactCode: string;
  pinnedVersion?: string | null;
  notes?: string;
};
