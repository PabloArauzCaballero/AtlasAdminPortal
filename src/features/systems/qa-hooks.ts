"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import { normalizePaginatedResponse } from "./normalizers";
import type {
  TestRunDetail,
  TestRunListResponse,
  TestSuiteDetail,
  TestSuiteListResponse,
} from "./types";

type RunTestSuiteInput = {
  environment: string;
  dryRun: boolean;
  baseUrl?: string;
  timeoutMs: number;
  config: Record<string, unknown>;
  headers: Record<string, string>;
};

async function listTestSuites(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/test-suites", { query });
  return normalizePaginatedResponse<TestSuiteListResponse["items"][number]>(
    response,
    ["testSuites", "suites", "records", "results"],
  );
}

function getTestSuite(suiteId: string) {
  return apiRequest<TestSuiteDetail>(`/systems/test-suites/${suiteId}`);
}

function runTestSuite(suiteId: string, body: RunTestSuiteInput) {
  return apiRequest<{
    runId?: string;
    status?: string;
    [key: string]: unknown;
  }>(`/systems/test-suites/${suiteId}/run`, { method: "POST", body });
}

async function listTestRuns(query: QueryParams) {
  const response = await apiRequest<unknown>("/systems/test-runs", { query });
  const normalized = normalizePaginatedResponse<Record<string, unknown>>(
    response,
    ["testRuns", "test_runs", "runs", "records", "results"],
  );
  return { ...normalized, items: normalized.items.map(normalizeTestRun) };
}

async function getTestRun(runId: string): Promise<TestRunDetail> {
  const response = await apiRequest<unknown>(`/systems/test-runs/${runId}`);
  const root = asRecord(response);
  const run = asRecord(root.run ?? root.testRun ?? root.test_run ?? response);
  const steps = arrayFrom(root.steps ?? root.stepRuns ?? root.step_runs);
  return {
    run: normalizeTestRun(run),
    steps: steps.map(normalizeTestStepRun),
  };
}

function normalizeTestRun(
  value: Record<string, unknown>,
): TestRunListResponse["items"][number] {
  return {
    runId: text(value.runId ?? value.run_id ?? value.id),
    suiteId: text(value.suiteId ?? value.suite_id ?? value.testSuiteId),
    environment: text(value.environment, "—"),
    triggeredBy: nullableText(value.triggeredBy ?? value.triggered_by),
    status: text(value.status, "UNKNOWN"),
    startedAt: nullableText(value.startedAt ?? value.started_at),
    finishedAt: nullableText(
      value.finishedAt ?? value.finished_at ?? value.completedAt,
    ),
    durationMs: nullableNumber(value.durationMs ?? value.duration_ms),
    summary: asRecord(
      value.summary ?? value.summaryJson ?? value.summary_json,
    ) as TestRunListResponse["items"][number]["summary"],
    logsUrl: nullableText(value.logsUrl ?? value.logs_url),
    createdAt: nullableText(value.createdAt ?? value.created_at),
  };
}

function normalizeTestStepRun(value: unknown): TestRunDetail["steps"][number] {
  const item = asRecord(value);
  return {
    stepRunId: text(item.stepRunId ?? item.step_run_id ?? item.id),
    testRunId: text(item.testRunId ?? item.test_run_id),
    stepId: text(item.stepId ?? item.step_id),
    status: text(item.status, "UNKNOWN"),
    requestPayloadSanitized: asRecord(
      item.requestPayloadSanitized ?? item.request_payload_sanitized,
    ),
    responseBodySanitized:
      item.responseBodySanitized ?? item.response_body_sanitized ?? null,
    statusCode: nullableNumber(item.statusCode ?? item.status_code),
    durationMs: nullableNumber(item.durationMs ?? item.duration_ms),
    errorMessage: nullableText(item.errorMessage ?? item.error_message),
    createdAt: nullableText(item.createdAt ?? item.created_at),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function arrayFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}
function nullableText(value: unknown): string | null {
  const result = text(value);
  return result || null;
}
function nullableNumber(value: unknown): number | null {
  const result = Number(value);
  return value !== null && value !== undefined && Number.isFinite(result)
    ? result
    : null;
}

export function useTestSuites(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.testSuites(query),
    queryFn: () => listTestSuites(query),
  });
}

export function useTestSuite(suiteId: string) {
  return useQuery({
    queryKey: queryKeys.testSuite(suiteId),
    queryFn: () => getTestSuite(suiteId),
    enabled: Boolean(suiteId),
  });
}

export function useRunTestSuiteMutation(suiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RunTestSuiteInput) => runTestSuite(suiteId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["systems", "test-runs"],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.testSuite(suiteId),
      });
    },
  });
}

export function useTestRuns(query: QueryParams) {
  return useQuery({
    queryKey: queryKeys.testRuns(query),
    queryFn: () => listTestRuns(query),
  });
}

export function useTestRun(runId: string, options?: { live?: boolean }) {
  return useQuery({
    queryKey: queryKeys.testRun(runId),
    queryFn: () => getTestRun(runId),
    enabled: Boolean(runId),
    refetchInterval: options?.live ? 5_000 : false,
  });
}
