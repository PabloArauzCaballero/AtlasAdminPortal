"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/api/client";
import type {
  CreateTestStepInput,
  ReorderTestStepsInput,
  TestStep,
  TestSuiteDetail,
  UpsertTestSuiteInput,
} from "./types";

/**
 * Autoría de suites y steps de QA (`SystemsTestController`).
 *
 * Vive aparte de `qa-hooks.ts` (lectura y ejecución) para no cruzar el límite
 * de 300 líneas y porque el backend separa los permisos: leer/ejecutar lo
 * puede casi todo systems-ops, pero crear y editar está restringido a
 * system_admin/platform_admin/qa_engineer.
 */

function createTestSuite(body: UpsertTestSuiteInput) {
  return apiRequest<TestSuiteDetail>("/systems/test-suites", {
    method: "POST",
    body,
  });
}

function updateTestSuite(suiteId: string, body: UpsertTestSuiteInput) {
  return apiRequest<TestSuiteDetail>(`/systems/test-suites/${suiteId}`, {
    method: "PATCH",
    body,
  });
}

function createTestStep(suiteId: string, body: CreateTestStepInput) {
  return apiRequest<TestStep>(`/systems/test-suites/${suiteId}/steps`, {
    method: "POST",
    body,
  });
}

function updateTestStep(
  suiteId: string,
  stepId: string,
  body: Partial<CreateTestStepInput>,
) {
  return apiRequest<TestStep>(
    `/systems/test-suites/${suiteId}/steps/${stepId}`,
    { method: "PATCH", body },
  );
}

function reorderTestSteps(suiteId: string, body: ReorderTestStepsInput) {
  return apiRequest<{ items: TestStep[] }>(
    `/systems/test-suites/${suiteId}/steps/reorder`,
    { method: "POST", body },
  );
}

/**
 * Crear/editar una suite o sus steps deja stale el listado, el detalle y la
 * cobertura de QA, así que se invalida la raíz del dominio en vez de intentar
 * enumerar cada key afectada.
 */
function useSystemsInvalidator() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["systems"] });
}

export function useCreateTestSuiteMutation() {
  const invalidate = useSystemsInvalidator();
  return useMutation({
    mutationFn: (body: UpsertTestSuiteInput) => createTestSuite(body),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useUpdateTestSuiteMutation(suiteId: string) {
  const invalidate = useSystemsInvalidator();
  return useMutation({
    mutationFn: (body: UpsertTestSuiteInput) => updateTestSuite(suiteId, body),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useCreateTestStepMutation(suiteId: string) {
  const invalidate = useSystemsInvalidator();
  return useMutation({
    mutationFn: (body: CreateTestStepInput) => createTestStep(suiteId, body),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useUpdateTestStepMutation(suiteId: string) {
  const invalidate = useSystemsInvalidator();
  return useMutation({
    mutationFn: (input: {
      stepId: string;
      body: Partial<CreateTestStepInput>;
    }) => updateTestStep(suiteId, input.stepId, input.body),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useReorderTestStepsMutation(suiteId: string) {
  const invalidate = useSystemsInvalidator();
  return useMutation({
    mutationFn: (body: ReorderTestStepsInput) =>
      reorderTestSteps(suiteId, body),
    onSuccess: async () => {
      await invalidate();
    },
  });
}
