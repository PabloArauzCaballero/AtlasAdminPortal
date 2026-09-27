import type { EndpointItem } from "@/features/systems/types";
import { pathParamFields, readContract } from "./contract-fields";
import type { FakerContext } from "./fakers/faker-types";
import { resolveFakerTemplate } from "./fakers/faker-template";
import { generateCases, generateLocalValues } from "./qa-case-generator";
import { generatePin, makeRandom } from "./qa-local-values";
import {
  getMockExamplePayload,
  isMockEndpointId,
} from "./mock-provider-endpoints";

/** Los tres bloques de datos de entrada de una petición. */
export type QaEntries = {
  payload: Record<string, unknown>;
  pathParams: Record<string, unknown>;
  queryParams: Record<string, unknown>;
};

/** Valores locales para los marcadores `{{qa.*}}` de las plantillas. */
export function qaLocalValues(
  seed: string,
  index = 0,
): Record<string, unknown> {
  return {
    pin: generatePin(makeRandom(`${seed}:pin:${index}`)),
    now: new Date().toISOString(),
  };
}

export function contractOf(endpoint?: EndpointItem) {
  return readContract(endpoint?.minPayloadSchema);
}

export function pathFieldsOf(endpoint?: EndpointItem) {
  const fromRoute = pathParamFields(endpoint?.fullPath ?? endpoint?.routePath);
  return fromRoute.length
    ? fromRoute
    : readContract(endpoint?.pathParamsSchema).fields;
}

/**
 * Lo que se carga al abrir una operación: un caso VÁLIDO del generador con la semilla elegida.
 *
 * Antes la caja se abría con el contrato literal (`{"email":"string|required"}`), o con datos de
 * la semilla `qa-base` fija aunque se hubiera elegido otra. Ahora sale del mismo lote que el
 * selector de personas, y los datos de consulta sólo llevan los obligatorios: generar todos los
 * opcionales —incluidos enums que el catálogo no enumera— producía 400 sin tocar nada.
 */
export function defaultEntries(
  endpoint: EndpointItem | undefined,
  seed: string,
  context: FakerContext,
): QaEntries {
  const mockExample =
    endpoint && isMockEndpointId(endpoint.endpointId)
      ? getMockExamplePayload(endpoint.endpointId)
      : undefined;
  const payload = mockExample
    ? resolveFakerTemplate(mockExample, context, qaLocalValues(seed)).value
    : (generateCases({
        fields: contractOf(endpoint).fields,
        kind: "valid",
        count: 1,
        seed,
        cases: [context],
      })[0]?.payload ?? {});
  return {
    payload,
    pathParams: generateLocalValues(pathFieldsOf(endpoint), seed),
    queryParams: generateLocalValues(
      readContract(endpoint?.queryParamsSchema).fields.filter(
        (field) => field.required,
      ),
      seed,
    ),
  };
}
