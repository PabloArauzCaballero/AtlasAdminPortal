import type { LocalListFilter } from "@/shared/components/data-table/local-list-table";
import type { Option } from "@/shared/lib/options";
import { ACTOR_LABELS, CLIENT_LABELS, WIRING } from "./labels";
import type { StepRow } from "./process-steps-table";
import type { ProcessStage, StepWiring } from "./types";

const ACTOR_HINTS: Record<string, string> = {
  customer: "Lo hace la persona cliente desde la app.",
  internal_user: "Lo hace una persona del equipo interno desde el portal.",
  merchant_user: "Lo hace una persona del comercio desde su portal.",
  platform_user: "Lo hace una persona del equipo de plataforma.",
  system: "Lo hace un sistema, sin intervención de una persona.",
  external_provider: "Lo hace un proveedor externo fuera de Atlas.",
};

const CLIENT_HINTS: Record<string, string> = {
  ADMIN_PORTAL: "Etapas que se hacen desde el portal interno.",
  ERP_PORTAL: "Etapas que se hacen desde el ERP.",
  MOTOR_PORTAL: "Etapas que se hacen desde el portal del Motor de decisiones.",
  CONSUMER_APP: "Etapas que el cliente hace desde su app.",
  DASHBOARDS_PORTAL: "Etapas que se consultan en los tableros.",
  BLOCK: "Etapas que hace un sistema por su cuenta.",
};

const optionsOf = (
  labels: Record<string, string>,
  hints: Record<string, string>,
): Option[] =>
  Object.entries(labels).map(([value, label]) => ({
    value,
    label,
    description: hints[value] ?? `Filas cuyo valor es «${label}».`,
  }));

export function buildStepFilters(
  stages: ProcessStage[],
): LocalListFilter<StepRow>[] {
  return [
    {
      name: "stage",
      label: "Etapa",
      tooltip:
        "Deja sólo los pasos de una etapa del proceso. Las etapas salen de la propia ficha del proceso.",
      options: stages.map((stage, index) => ({
        value: stage.code,
        label: `${index + 1}. ${stage.name}`,
        description: stage.description,
      })),
      test: (row, value) => row.stage.code === value,
    },
    {
      name: "actor",
      label: "Quién actúa",
      tooltip:
        "Deja sólo los pasos que hace ese tipo de actor: cliente, equipo interno, comercio, sistema…",
      options: optionsOf(ACTOR_LABELS, ACTOR_HINTS),
      test: (row, value) => row.stage.actor === value,
    },
    {
      name: "client",
      label: "Portal",
      tooltip:
        "Deja sólo los pasos de las etapas que se hacen desde ese portal o app.",
      options: optionsOf(CLIENT_LABELS, CLIENT_HINTS),
      test: (row, value) => row.stage.client === value,
    },
    {
      name: "wiring",
      label: "Cableado",
      tooltip:
        "Separa los pasos con pantalla, sin pantalla, automáticos o sin comprobar. «Sin pantalla» son los que una persona debería hacer y ningún portal permite.",
      options: (Object.keys(WIRING) as StepWiring[]).map((value) => ({
        value,
        label: WIRING[value].label,
        description: WIRING[value].hint,
      })),
      test: (row, value) => row.step?.wiring === value,
    },
  ];
}
