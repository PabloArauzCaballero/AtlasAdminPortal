import { HandCoins } from "lucide-react";
import type { InternalNavItem } from "./nav-config";
import { PAYMENT_CLAIMS_ROLE_LIST } from "@/shared/auth/portal-roles";

/**
 * «Avisos de pago», en su propio archivo porque `nav-groups-secondary.ts` está en el tope de
 * `max-lines`.
 *
 * Sólo supervisar: la verificación es del comercio, en el ERP. El backend gatea por @Roles
 * (`OperationsPaymentClaimsController`) y no hay permiso granular.
 */
export const paymentClaimsNavItem: InternalNavItem = {
  label: "Avisos de pago",
  href: "/internal/operations/payment-claims",
  icon: HandCoins,
  permissions: [],
  roles: PAYMENT_CLAIMS_ROLE_LIST,
};
