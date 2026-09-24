import type {
  QaCapabilities,
  QaDatasetMode,
  QaEnvironment,
  QaRunRequest,
  QaTemplateSummary,
} from "./types";

/** Semilla por defecto: la misma que usa la campaña de regresión, para poder comparar corridas. */
export const DEFAULT_SEED = "atlas-qa-regression-v1";
export const DEFAULT_PERSONS = 10;
export const DEFAULT_CONCURRENCY = 2;

export type LaunchForm = {
  templateKey: string;
  environmentId: string;
  persons: number;
  concurrency: number;
  datasetMode: QaDatasetMode;
  scenarioCode: string;
  seed: string;
};

export function templateKeyOf(template: { code: string; version: string }) {
  return `${template.code}@${template.version}`;
}

export function findTemplate(
  templates: readonly QaTemplateSummary[],
  key: string,
): QaTemplateSummary | undefined {
  return templates.find((template) => templateKeyOf(template) === key);
}

export function findEnvironment(
  capabilities: QaCapabilities | undefined,
  environmentId: string,
): QaEnvironment | undefined {
  return capabilities?.environments.find(
    (environment) => environment.environmentId === environmentId,
  );
}

/** Los datos por defecto son NORMALES si la plantilla los admite. */
export function defaultDatasetMode(
  template?: QaTemplateSummary,
): QaDatasetMode {
  if (!template || template.datasetModes.includes("NORMAL_SYNTHETIC"))
    return "NORMAL_SYNTHETIC";
  return template.datasetModes[0] ?? "NORMAL_SYNTHETIC";
}

/** Formulario inicial: primera plantilla lista (o la pedida), su escenario y datos normales. */
export function initialForm(
  templates: readonly QaTemplateSummary[],
  capabilities: QaCapabilities | undefined,
  preferredKey?: string,
): LaunchForm {
  const template =
    (preferredKey ? findTemplate(templates, preferredKey) : undefined) ??
    templates.find((item) => item.status === "READY") ??
    templates[0];
  const environment = capabilities?.environments[0];
  return {
    templateKey: template ? templateKeyOf(template) : "",
    environmentId: environment?.environmentId ?? "",
    persons: Math.min(
      DEFAULT_PERSONS,
      environment?.maxPersons ?? DEFAULT_PERSONS,
    ),
    concurrency: Math.min(
      DEFAULT_CONCURRENCY,
      environment?.maxConcurrency ?? DEFAULT_CONCURRENCY,
    ),
    datasetMode: defaultDatasetMode(template),
    scenarioCode: template?.defaultScenario ?? "",
    seed: DEFAULT_SEED,
  };
}

/** Al cambiar de plantilla se reinician su escenario y sus datos: los de otra no aplican. */
export function withTemplate(
  form: LaunchForm,
  template: QaTemplateSummary | undefined,
): LaunchForm {
  return {
    ...form,
    templateKey: template ? templateKeyOf(template) : "",
    scenarioCode: template?.defaultScenario ?? "",
    datasetMode: template?.datasetModes.includes(form.datasetMode)
      ? form.datasetMode
      : defaultDatasetMode(template),
  };
}

/** Qué impide validar, antes de preguntarle al servidor. Vacío = se puede validar. */
export function localProblems(
  form: LaunchForm,
  template: QaTemplateSummary | undefined,
  environment: QaEnvironment | undefined,
): string[] {
  const problems: string[] = [];
  if (!template) problems.push("Elige una plantilla de recorrido.");
  if (!environment) problems.push("Elige el entorno de QA donde se ejecuta.");
  if (!Number.isInteger(form.persons) || form.persons < 1)
    problems.push("Personas debe ser un número entero mayor que cero.");
  if (!Number.isInteger(form.concurrency) || form.concurrency < 1)
    problems.push("Concurrencia debe ser un número entero mayor que cero.");
  if (environment && form.persons > environment.maxPersons)
    problems.push(
      `Este entorno admite hasta ${environment.maxPersons} personas.`,
    );
  if (environment && form.concurrency > environment.maxConcurrency)
    problems.push(
      `Este entorno admite hasta ${environment.maxConcurrency} personas a la vez.`,
    );
  if (form.concurrency > form.persons)
    problems.push("La concurrencia no puede superar la cantidad de personas.");
  if (!form.seed.trim()) problems.push("La semilla no puede quedar vacía.");
  return problems;
}

export function toRunRequest(
  form: LaunchForm,
  template: QaTemplateSummary,
): QaRunRequest {
  return {
    templateCode: template.code,
    templateVersion: template.version,
    environmentId: form.environmentId,
    mode: "INTEGRATED_QA",
    persons: form.persons,
    concurrency: form.concurrency,
    seed: form.seed.trim(),
    datasetMode: form.datasetMode,
    scenarioCode: form.scenarioCode,
  };
}

export function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${seconds} s`;
  return `${Math.round(seconds / 60)} min`;
}
