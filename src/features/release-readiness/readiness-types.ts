export type ReadyStatus = "OK" | "NEEDS_REVIEW" | "BLOCKED";

export type ReadyItem = {
  key: string;
  label: string;
  status: ReadyStatus;
  detail: string;
};
