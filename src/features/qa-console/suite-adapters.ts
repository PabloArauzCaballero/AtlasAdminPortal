import type {
  CreateTestStepInput,
  StressEnvironment,
  TestStep,
  TestSuite,
  TestSuiteType,
  UpsertTestSuiteInput,
} from "@/features/systems/types";
import type { JsonRecord } from "@/shared/api/types";
import {
  emptyStepForm,
  SUITE_ENVIRONMENTS,
  SUITE_TYPES,
  type StepForm,
  type SuiteForm,
} from "./suite-schema";

function parseJsonObject(value: string): JsonRecord | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  // El schema ya validó que parsea a objeto; si igual falla, se omite el campo
  // y el backend aplica su default, en vez de tumbar el envío entero.
  try {
    return JSON.parse(trimmed) as JsonRecord;
  } catch {
    return undefined;
  }
}

function stringifyJsonObject(value: JsonRecord | null | undefined): string {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

export function toSuiteForm(suite: TestSuite): SuiteForm {
  return {
    code: suite.code,
    name: suite.name,
    description: suite.description ?? "",
    module: suite.module,
    suiteType: (SUITE_TYPES as readonly string[]).includes(suite.suiteType)
      ? (suite.suiteType as TestSuiteType)
      : "INTEGRATION",
    environmentScope: suite.environmentScope.filter(
      (scope): scope is StressEnvironment =>
        (SUITE_ENVIRONMENTS as readonly string[]).includes(scope),
    ),
    isEnabled: suite.isEnabled,
    requiresSeedData: suite.requiresSeedData,
    isSafeForProduction: suite.isSafeForProduction,
    requiresDestructivePermission: suite.requiresDestructivePermission,
  };
}

export function toSuiteInput(values: SuiteForm): UpsertTestSuiteInput {
  return {
    code: values.code,
    name: values.name,
    description: values.description.trim() || undefined,
    module: values.module,
    suiteType: values.suiteType,
    environmentScope: values.environmentScope,
    isEnabled: values.isEnabled,
    requiresSeedData: values.requiresSeedData,
    isSafeForProduction: values.isSafeForProduction,
    requiresDestructivePermission: values.requiresDestructivePermission,
  };
}

/**
 * En el PATCH de suite el backend no aplica defaults a propósito: manda solo lo
 * que cambió. Reenviar todo sería inofensivo, pero mandar el `code` de una
 * suite existente no la renombra de forma segura — se omite para no tocarlo.
 */
export function toSuiteUpdateInput(values: SuiteForm): UpsertTestSuiteInput {
  const input = toSuiteInput(values);
  delete input.code;
  return input;
}

export function toStepForm(step: TestStep): StepForm {
  return {
    ...emptyStepForm(step.stepOrder),
    endpointId: step.endpointId ?? "",
    stepOrder: step.stepOrder,
    name: step.name,
    inputMode: (
      [
        "DEFAULT",
        "CONFIGURABLE",
        "GENERATED",
        "FROM_PREVIOUS_STEP",
      ] as readonly string[]
    ).includes(step.inputMode)
      ? (step.inputMode as StepForm["inputMode"])
      : "DEFAULT",
    method: (
      [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
        "HEAD",
      ] as readonly string[]
    ).includes(step.method)
      ? (step.method as StepForm["method"])
      : "GET",
    pathTemplate: step.pathTemplate,
    defaultHeaders: stringifyJsonObject(step.defaultHeaders),
    defaultPayload: stringifyJsonObject(step.defaultPayload),
    configSchema: stringifyJsonObject(step.configSchema),
    extractors: stringifyJsonObject(step.extractors),
    assertions: stringifyJsonObject(step.assertions),
    continueOnFailure: step.continueOnFailure,
    cleanupRequired: step.cleanupRequired,
  };
}

export function toStepInput(values: StepForm): CreateTestStepInput {
  return {
    // `null` desasocia el step del catálogo de endpoints; `undefined` lo dejaría
    // sin tocar en el PATCH, que no es lo que pide un campo vaciado a mano.
    endpointId: values.endpointId.trim() || null,
    stepOrder: values.stepOrder,
    name: values.name,
    inputMode: values.inputMode,
    method: values.method,
    pathTemplate: values.pathTemplate,
    defaultHeaders: parseJsonObject(values.defaultHeaders),
    defaultPayload: parseJsonObject(values.defaultPayload),
    configSchema: parseJsonObject(values.configSchema),
    extractors: parseJsonObject(values.extractors),
    assertions: parseJsonObject(values.assertions),
    continueOnFailure: values.continueOnFailure,
    cleanupRequired: values.cleanupRequired,
  };
}
