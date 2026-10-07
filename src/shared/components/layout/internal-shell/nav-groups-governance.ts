import { Boxes, FileSignature, FileText, ShieldCheck } from "lucide-react";
import {
  DECISION_ARTIFACT_ROLE_LIST,
  INTERNAL_PORTAL_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import type { InternalNavGroup } from "./nav-config";

/**
 * El grupo «Gobierno»: lo que se le dice al cliente, las políticas y quién decide.
 *
 * Eran once entradas (2026-10-07). Las dos de calidad se fueron a «Datos»; los dos textos que
 * alguien acepta para entrar, las tres pantallas llamadas «política» y las dos del motor de
 * decisiones —que vivían en grupos distintos— son ahora una entrada cada una.
 */
export const governanceGroup: InternalNavGroup = {
  label: "Gobierno",
  icon: ShieldCheck,
  items: [
    {
      // Los dos textos que alguien acepta para entrar: quien revisa uno revisa el otro.
      label: "Textos legales",
      href: "/internal/settings/consent-documents",
      icon: FileText,
      permissions: [],
      tabs: [
        {
          label: "Consentimientos del cliente",
          href: "/internal/settings/consent-documents",
          icon: FileText,
          permissions: ["governance.policies.read"],
        },
        {
          // Verificar que un comercio existe no es tener algo firmado con él.
          label: "Contrato de comercios",
          href: "/internal/settings/partner-contracts",
          icon: FileSignature,
          // El backend gatea por @Roles, como el resto de operaciones sobre el expediente.
          permissions: [],
          roles: INTERNAL_PORTAL_ROLE_LIST,
        },
      ],
    },
    {
      /*
       * Junto a los textos legales y no en un apartado de marketing: las preguntas frecuentes
       * explican cómo se calcula la línea y qué pasa si te atrasas, que es información contractual
       * con otro tono.
       */
      label: "Contenido de la app",
      href: "/internal/settings/app-content",
      icon: FileText,
      permissions: ["governance.policies.read"],
    },
    {
      label: "Políticas",
      href: "/internal/governance/policies",
      icon: ShieldCheck,
      permissions: [],
      tabs: [
        {
          label: "De gobierno",
          href: "/internal/governance/policies",
          icon: ShieldCheck,
          permissions: ["governance.policies.read"],
        },
        {
          // Declarar que el aviso de mora es irrenunciable es una decisión de cumplimiento, no un
          // ajuste de producto.
          label: "De notificación",
          href: "/internal/settings/notification-policies",
          icon: FileText,
          permissions: ["governance.policies.read"],
        },
        {
          label: "De riesgo",
          href: "/internal/risk-policy/current",
          icon: ShieldCheck,
          permissions: ["operations.riskPolicy.read"],
        },
      ],
    },
    {
      label: "Gobierno de datos",
      href: "/internal/governance",
      icon: ShieldCheck,
      permissions: ["governance.data.read"],
    },
    {
      /*
       * La cola de pedidos de los clientes sobre sus datos (hallazgo A5). Entrada propia y no
       * pestaña: la atiende cumplimiento y el plazo es legal.
       */
      label: "Solicitudes de privacidad",
      href: "/internal/governance/privacy-requests",
      icon: ShieldCheck,
      permissions: ["privacy.requests.read"],
    },
    {
      label: "Motor de decisiones",
      href: "/internal/settings/decision-artifacts",
      icon: ShieldCheck,
      permissions: [],
      tabs: [
        {
          /*
           * Qué política del motor decide una identidad o un crédito era una variable de entorno:
           * cambiarla exigía un despliegue y nadie podía ver cuál estaba decidiendo.
           */
          label: "Qué decide cada cosa",
          href: "/internal/settings/decision-artifacts",
          icon: ShieldCheck,
          // El backend gatea por @Roles, no por permiso: la lista es copia declarada de la suya.
          permissions: [],
          roles: DECISION_ARTIFACT_ROLE_LIST,
        },
        {
          label: "Artefactos del motor",
          href: "/internal/systems/decision-engine/artifacts",
          icon: Boxes,
          permissions: ["systems.decisionEngine.artifacts.read"],
        },
      ],
    },
  ],
};
