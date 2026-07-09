import type { EndpointItem } from "@/features/systems/types";
import { Badge } from "@/shared/components/ui/badges";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { DEFAULT_QA_BASE_ROUTE } from "./base-routes";
import {
  CheckBox,
  NumberField,
  QaExpectationsControls,
  QaTargetControls,
  type CommonLabFormState,
} from "./qa-controls";
import { isMutatingMethod } from "./qa-safety";

export function StressControls({
  form,
  endpoint,
  onChange,
}: Readonly<StressControlsProps>) {
  const requiresMutationGuard = Boolean(
    endpoint && (isMutatingMethod(endpoint.method) || endpoint.isDestructive),
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Ambiente">
          <Select
            value={form.environment}
            onChange={(event) => onChange({ environment: event.target.value })}
          >
            <option value="LOCAL">LOCAL</option>
            <option value="STAGING">STAGING</option>
            <option value="PRODUCTION_READONLY">PRODUCTION_READONLY</option>
          </Select>
        </Field>
        <NumberField
          label="RPS objetivo"
          value={form.targetRps}
          min={1}
          max={500}
          onChange={(value) => onChange({ targetRps: value })}
        />
        <NumberField
          label="Concurrencia"
          value={form.concurrency}
          min={1}
          max={200}
          onChange={(value) => onChange({ concurrency: value })}
        />
        <NumberField
          label="Duracion segundos"
          value={form.durationSeconds}
          min={1}
          max={3600}
          onChange={(value) => onChange({ durationSeconds: value })}
        />
        <NumberField
          label="Ramp-up segundos"
          value={form.rampUpSeconds}
          min={0}
          max={3600}
          onChange={(value) => onChange({ rampUpSeconds: value })}
        />
        <NumberField
          label="Max requests"
          value={form.maxRequests}
          min={1}
          max={10000}
          onChange={(value) => onChange({ maxRequests: value })}
        />
        <NumberField
          label="Timeout ms"
          value={form.timeoutMs}
          min={1000}
          max={120000}
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <NumberField
          label="Max error %"
          value={form.maxErrorRatePercent}
          min={0}
          max={100}
          onChange={(value) => onChange({ maxErrorRatePercent: value })}
        />
        <NumberField
          label="Min throughput RPS"
          value={form.minThroughputRps}
          min={0}
          max={500}
          onChange={(value) => onChange({ minThroughputRps: value })}
        />
        <NumberField
          label="Max avg ms"
          value={form.maxAvgMs}
          min={0}
          max={120000}
          onChange={(value) => onChange({ maxAvgMs: value })}
        />
        <NumberField
          label="Max p95 ms"
          value={form.maxP95Ms}
          min={0}
          max={120000}
          onChange={(value) => onChange({ maxP95Ms: value })}
        />
        <NumberField
          label="Max p99 ms"
          value={form.maxP99Ms}
          min={0}
          max={120000}
          onChange={(value) => onChange({ maxP99Ms: value })}
        />
        <Field label="Ticket aprobacion">
          <Input
            value={form.approvalTicket}
            onChange={(event) =>
              onChange({ approvalTicket: event.target.value })
            }
            placeholder="CHG-123"
          />
        </Field>
      </div>
      <QaTargetControls form={form} endpoint={endpoint} onChange={onChange} />
      <QaExpectationsControls
        form={form}
        variant="stress"
        onChange={onChange}
      />
      <div className="flex flex-wrap gap-3">
        <CheckBox
          label="Dry-run / modo seguro"
          checked={form.dryRun}
          onChange={(value) => onChange({ dryRun: value })}
        />
        {requiresMutationGuard ? (
          <CheckBox
            label="Permitir mutacion en stress"
            checked={form.allowMutations}
            onChange={(value) => onChange({ allowMutations: value })}
          />
        ) : null}
      </div>
    </div>
  );
}

export function StressSafetyHints({
  endpoint,
}: Readonly<{ endpoint?: EndpointItem }>) {
  if (!endpoint) return null;
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-atlas-border bg-atlas-soft p-3 text-xs">
      <Badge tone="default">limite duro: 10.000 requests</Badge>
      <Badge tone="default">ramp-up y max requests configurables</Badge>
      <Badge tone={endpoint.requiresStressTest ? "warning" : "default"}>
        {endpoint.requiresStressTest ? "stress requerido" : "stress opcional"}
      </Badge>
      {endpoint.isDestructive ? (
        <Badge tone="critical">destructivo</Badge>
      ) : null}
      {endpoint.containsPii ? <Badge tone="warning">contiene PII</Badge> : null}
    </div>
  );
}

export type StressFormState = CommonLabFormState & {
  environment: string;
  dryRun: boolean;
  targetRps: number;
  durationSeconds: number;
  concurrency: number;
  rampUpSeconds: number;
  maxRequests: number;
  timeoutMs: number;
  maxErrorRatePercent: number;
  minThroughputRps: number;
  maxAvgMs: number;
  maxP95Ms: number;
  maxP99Ms: number;
  approvalTicket: string;
  allowMutations: boolean;
  payload: string;
  queryParams: string;
  pathParams: string;
  headers: string;
  expectedHeaders: string;
  expectedJsonSubset: string;
};

export const DEFAULT_STRESS_FORM: StressFormState = {
  environment: "LOCAL",
  baseRouteKey: DEFAULT_QA_BASE_ROUTE,
  customHostUrl: "",
  routeOverride: "",
  dryRun: true,
  targetRps: 5,
  durationSeconds: 30,
  concurrency: 5,
  rampUpSeconds: 5,
  maxRequests: 100,
  timeoutMs: 20000,
  maxErrorRatePercent: 5,
  minThroughputRps: 0,
  maxAvgMs: 0,
  maxP95Ms: 2000,
  maxP99Ms: 0,
  approvalTicket: "",
  allowMutations: false,
  payload: "{}",
  queryParams: "{}",
  pathParams: "{}",
  headers: "{}",
  expectedStatusCodes: "200",
  expectedHeaders: "{}",
  expectedJsonSubset: "",
  expectedBodyContains: "",
  maxLatencyMs: 0,
  maxResponseSizeBytes: 0,
};

type StressControlsProps = {
  form: StressFormState;
  endpoint?: EndpointItem;
  onChange: (value: Partial<StressFormState>) => void;
};
