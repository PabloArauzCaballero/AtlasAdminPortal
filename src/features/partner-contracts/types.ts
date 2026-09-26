/**
 * El contrato bajo el que se afilia un comercio.
 *
 * Es el texto POR DEFECTO del inquilino: el que rige cuando a un comercio nadie le negoció uno
 * propio. Un contrato particular no vive aquí — es un término comercial y se lleva en el ERP, igual
 * que la comisión.
 */
export type PartnerContractTemplate = {
  templateId: string;
  /** Estable entre versiones: es lo que identifica «el mismo contrato» a lo largo del tiempo. */
  templateCode: string;
  name: string;
  version: number;
  body: string;
  /** `active` o `archived`. Archivada es la que rigió antes y sigue siendo prueba. */
  status: string;
  isDefault: boolean;
  effectiveFrom: string | null;
  createdAt: string | null;
};

export type PartnerContractTemplateList = { items: PartnerContractTemplate[] };
export type PartnerContractDefault = {
  template: PartnerContractTemplate | null;
};

export type PublishContractTemplate = {
  templateCode: string;
  name: string;
  body: string;
  makeDefault: boolean;
};
