import type { EndpointItem } from "@/features/systems/types";
import { ENVIRONMENT_OPTIONS } from "./qa-lab-options";
import { Badge } from "@/shared/components/ui/badges";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { formatNumber } from "@/shared/lib/format";
import { DEFAULT_QA_BASE_ROUTE } from "./base-routes";
import { HARD_MAX_STRESS_REQUESTS } from "./stress-plan";
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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Field
          label="Ambiente"
          tooltip="Contra qué API se lanza la carga; producción está bloqueada."
          hint="Contra producción no se permite carga."
        >
          <Select
            name="ambiente"
            options={ENVIRONMENT_OPTIONS}
            value={form.environment}
            onChange={(valor) => onChange({ environment: valor })}
          />
        </Field>
        <NumberField
          label="Peticiones por segundo"
          tooltip="Ritmo que la prueba intenta sostener (en inglés, RPS)."
          value={form.targetRps}
          min={1}
          max={500}
          hint="Cuántas peticiones por segundo se intentan enviar."
          onChange={(value) => onChange({ targetRps: value })}
        />
        <NumberField
          label="Peticiones a la vez"
          tooltip="Cuántas pueden estar esperando respuesta al mismo tiempo; simula usuarios simultáneos."
          value={form.concurrency}
          min={1}
          max={200}
          hint="Máximo de peticiones esperando respuesta a la vez."
          onChange={(value) => onChange({ concurrency: value })}
        />
        <NumberField
          label="Duración (s)"
          tooltip="Cuánto dura la carga; más tiempo destapa fugas y colas."
          value={form.durationSeconds}
          min={1}
          max={3600}
          hint="Tiempo total previsto de la carga."
          onChange={(value) => onChange({ durationSeconds: value })}
        />
        <NumberField
          label="Subida gradual (s)"
          tooltip="Segundos para llegar al ritmo pedido poco a poco en vez de golpear de entrada."
          value={form.rampUpSeconds}
          min={0}
          max={3600}
          hint="Durante estos segundos el ritmo sube de a poco hasta el pedido."
          onChange={(value) => onChange({ rampUpSeconds: value })}
        />
        <NumberField
          label="Tope de peticiones"
          tooltip="Máximo de peticiones en total, para no disparar más de lo previsto."
          value={form.maxRequests}
          min={1}
          max={HARD_MAX_STRESS_REQUESTS}
          hint={`Si ritmo × duración (${formatNumber(form.targetRps * form.durationSeconds)} previstas) supera este valor, la carga se corta aquí.`}
          onChange={(value) => onChange({ maxRequests: value })}
        />
        <NumberField
          label="Espera máxima por petición (ms)"
          tooltip="Milisegundos que se espera cada respuesta antes de contarla como error."
          value={form.timeoutMs}
          min={1000}
          max={120000}
          hint="Pasado este tiempo sin respuesta, la petición cuenta como error."
          onChange={(value) => onChange({ timeoutMs: value })}
        />
        <NumberField
          label="Errores tolerados (%)"
          tooltip="Porcentaje de errores tolerado antes de reprobar la corrida."
          value={form.maxErrorRatePercent}
          min={0}
          max={100}
          hint="Si falla un porcentaje mayor de peticiones, la carga no aprueba."
          onChange={(value) => onChange({ maxErrorRatePercent: value })}
        />
        <NumberField
          label="Rendimiento mínimo (peticiones/s)"
          tooltip="Peticiones por segundo que como mínimo tienen que completarse; 0 desactiva este umbral."
          value={form.minThroughputRps}
          min={0}
          max={500}
          hint="Si se completan menos por segundo, no aprueba (0 = sin umbral)."
          onChange={(value) => onChange({ minThroughputRps: value })}
        />
        <NumberField
          label="Tiempo medio máximo (ms)"
          tooltip="Tiempo de respuesta medio máximo para aprobar; 0 desactiva este umbral."
          value={form.maxAvgMs}
          min={0}
          max={120000}
          hint="Si el tiempo medio lo supera, no aprueba (0 = sin umbral)."
          onChange={(value) => onChange({ maxAvgMs: value })}
        />
        <NumberField
          label="Tope del p95 (ms)"
          tooltip="Tiempo que el 95 % de las peticiones no debe superar (el «p95»)."
          value={form.maxP95Ms}
          min={0}
          max={120000}
          hint="El p95 es el tiempo por debajo del cual queda el 95 % de las peticiones."
          onChange={(value) => onChange({ maxP95Ms: value })}
        />
        <NumberField
          label="Tope del p99 (ms)"
          tooltip="Tiempo que el 99 % de las peticiones no debe superar; 0 lo ignora."
          value={form.maxP99Ms}
          min={0}
          max={120000}
          hint="Igual que el p95 pero con el 99 % (0 = sin umbral)."
          onChange={(value) => onChange({ maxP99Ms: value })}
        />
        <Field
          label="Ticket de aprobación"
          tooltip="Número del cambio aprobado que autoriza la carga real. Ej.: CHG-123"
          hint="Obligatorio para una carga real fuera de tu máquina (al menos 5 caracteres)."
        >
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
          label="Sólo previsualizar (no envía nada)"
          checked={form.dryRun}
          onChange={(value) => onChange({ dryRun: value })}
        />
        {requiresMutationGuard ? (
          <CheckBox
            label="Permitir cambios reales en la carga"
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
      <Badge tone="default">
        tope firme: {formatNumber(HARD_MAX_STRESS_REQUESTS)} peticiones
      </Badge>
      <Badge tone="default">corre en tu navegador · no se guarda</Badge>
      <Badge tone={endpoint.requiresStressTest ? "warning" : "default"}>
        {endpoint.requiresStressTest ? "carga requerida" : "carga opcional"}
      </Badge>
      {endpoint.isDestructive ? (
        <Badge tone="critical">destructivo</Badge>
      ) : null}
      {endpoint.containsPii ? (
        <Badge tone="warning">datos personales</Badge>
      ) : null}
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
  // 1000 en vez de 100: con los defaults de RPS (5) y duración (30s) el plan
  // planeado es 150 requests; un tope de 100 recortaba en silencio incluso la
  // configuración por defecto sin que el usuario tocara nada.
  maxRequests: 1000,
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
  scenario: "valid_payload",
  authMode: "session",
  customAuthToken: "",
  includeTenantHeader: true,
  includeIdempotencyKey: true,
  deviceProfile: "none",
  mockScenario: "",
  mockLatencyMs: 0,
};

type StressControlsProps = {
  form: StressFormState;
  endpoint?: EndpointItem;
  onChange: (value: Partial<StressFormState>) => void;
};
