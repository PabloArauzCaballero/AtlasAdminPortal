import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Database,
  FileClock,
  FileSignature,
  FileText,
  Gauge,
  GitBranch,
  GraduationCap,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import {
  DECISION_ARTIFACT_ROLE_LIST,
  INTERNAL_PORTAL_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import type { InternalNavGroup } from "./nav-config";
import { processesGroup } from "./nav-groups-processes";
import { systemsOpsGroup } from "./nav-groups-systems-ops";

export const navGroupsPrimary: InternalNavGroup[] = [
  systemsOpsGroup,
  processesGroup,
  {
    label: "Catálogo y metadata",
    icon: Database,
    items: [
      {
        label: "Catálogo de datos",
        href: "/internal/data-catalog/tables",
        icon: Database,
        permissions: ["catalog.data.read"],
      },
      {
        // Dominios y glosario son una pantalla con dos pestañas; `/glossary` redirige a la segunda.
        label: "Dominios y glosario",
        href: "/internal/business-metadata/domains",
        icon: BookOpen,
        permissions: ["businessMetadata.read"],
      },
      {
        // «del motor»: es el vocabulario semántico del motor de decisión (eventos, atributos,
        // features), no el glosario de negocio. Mismo permiso que la pantalla y que AtlasBackend
        // reparte a quien la usa: con `businessMetadata.read` el ítem salía a quien después veía
        // «acceso restringido» y no salía a operaciones, que sí la lee.
        label: "Definiciones del motor",
        href: "/internal/business-metadata/definitions",
        icon: BookOpen,
        permissions: ["operations.definitions.read"],
      },
      {
        label: "Catálogos operativos",
        href: "/internal/operations/catalogs",
        icon: Database,
        permissions: ["operations.catalogs.read"],
      },
    ],
  },
  {
    label: "Lineage",
    icon: GitBranch,
    items: [
      {
        // Una pantalla con pestañas (Grafo, Nodos, Relaciones e impacto, Mapa por dominio). Las
        // antiguas «Lineage oficial» e «Impacto lineage» redirigen a su pestaña.
        label: "Lineage",
        href: "/internal/lineage",
        icon: GitBranch,
        permissions: ["lineage.read"],
      },
    ],
  },
  {
    label: "Gobierno y calidad",
    icon: ShieldCheck,
    items: [
      {
        /*
         * Va con las politicas y no en «Administracion», que es donde estaba: quien busca el texto
         * legal que acepta el cliente lo busca junto a las demas politicas, no al final de una lista
         * de cuarenta y nueve enlaces. Estaba puesto, pero no se encontraba — que a efectos
         * practicos es lo mismo que no estar.
         */
        label: "Consentimientos del cliente",
        href: "/internal/settings/consent-documents",
        icon: FileText,
        permissions: ["governance.policies.read"],
      },
      {
        /*
         * El contrato del COMERCIO va junto al consentimiento del CLIENTE: son los dos textos que
         * alguien acepta para entrar, y quien revisa uno revisa el otro. Verificar que un comercio
         * existe no es tener algo firmado con él, y hasta ahora no había dónde fijar ese texto.
         */
        label: "Contrato de comercios",
        href: "/internal/settings/partner-contracts",
        icon: FileSignature,
        // El backend gatea por @Roles, como el resto de operaciones sobre el expediente.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        /*
         * El contenido de la app va JUNTO a los consentimientos y no en un apartado de marketing:
         * las preguntas frecuentes explican como se calcula la linea y que pasa si te atrasas, que
         * es informacion contractual con otro tono. Quien revisa lo que se le dice al cliente tiene
         * que poder revisarlo todo desde el mismo sitio.
         */
        label: "Contenido de la app",
        href: "/internal/settings/app-content",
        icon: FileText,
        permissions: ["governance.policies.read"],
      },
      {
        /*
         * Y las politicas de aviso tambien: declarar que el aviso de mora es irrenunciable es una
         * decision de cumplimiento, no un ajuste de producto.
         */
        label: "Políticas de notificación",
        href: "/internal/settings/notification-policies",
        icon: FileText,
        permissions: ["governance.policies.read"],
      },
      {
        /*
         * Que politica del motor decide una identidad o un credito era una variable de entorno:
         * cambiarla exigia un despliegue y nadie podia ver cual estaba decidiendo. Es gobierno del
         * riesgo, y por eso vive aqui y no en un fichero de configuracion.
         */
        label: "Motor de decisiones",
        href: "/internal/settings/decision-artifacts",
        icon: ShieldCheck,
        // El backend gatea por @Roles, no por permiso: la lista es copia declarada de la suya.
        permissions: [],
        roles: DECISION_ARTIFACT_ROLE_LIST,
      },
      {
        label: "Gobierno de datos",
        href: "/internal/governance",
        icon: ShieldCheck,
        permissions: ["governance.data.read"],
      },
      {
        /*
         * La cola de pedidos de los clientes sobre sus datos (hallazgo A5). Va junto al gobierno de
         * datos y no en operaciones: la atiende cumplimiento y el plazo es legal, no operativo.
         */
        label: "Solicitudes de privacidad",
        href: "/internal/governance/privacy-requests",
        icon: ShieldCheck,
        permissions: ["privacy.requests.read"],
      },
      {
        label: "Políticas gobierno",
        href: "/internal/governance/policies",
        icon: ShieldCheck,
        permissions: ["governance.policies.read"],
      },
      {
        label: "Política riesgo",
        href: "/internal/risk-policy/current",
        icon: ShieldCheck,
        permissions: ["operations.riskPolicy.read"],
      },
      {
        label: "Issues calidad",
        href: "/internal/data-quality/issues",
        icon: ClipboardCheck,
        permissions: ["dataQuality.issues.read"],
      },
      {
        label: "Reglas calidad",
        href: "/internal/data-quality/rules",
        icon: ClipboardCheck,
        permissions: ["dataQuality.rules.read"],
      },
    ],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    items: [
      {
        label: "Reportes",
        href: "/internal/reports",
        icon: BarChart3,
        permissions: ["reporting.read"],
      },
      {
        label: "Readiness Release",
        href: "/internal/release-readiness",
        icon: ClipboardCheck,
        permissions: ["reporting.read"],
      },
    ],
  },
  {
    label: "QA",
    icon: TestTube2,
    items: [
      {
        label: "Laboratorio QA",
        href: "/internal/qa/lab",
        icon: TestTube2,
        permissions: ["systems.endpoints.read"],
      },
      {
        label: "Aprender QA Lab",
        href: "/internal/qa/aprender",
        icon: GraduationCap,
        permissions: ["systems.endpoints.read"],
      },
      {
        label: "Suites QA",
        href: "/internal/qa/suites",
        icon: ClipboardCheck,
        permissions: ["systems.qa.read"],
      },
      {
        label: "Ejecuciones QA",
        href: "/internal/qa/runs",
        icon: FileClock,
        permissions: ["systems.qa.read"],
      },
      {
        label: "Carga QA",
        href: "/internal/qa/stress",
        icon: Gauge,
        permissions: ["systems.stress.read"],
      },
    ],
  },
];
