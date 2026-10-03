/**
 * Tipos del ECOSISTEMA: bloques, salud de la red y artefactos del motor de decisión.
 *
 * Viven fuera de `catalog-types.ts` porque aquel archivo describe el contenido del catálogo (qué
 * tablas y qué rutas hay) y esto describe a sus DUEÑOS (de qué producto vienen y si ese producto
 * está aportando lo suyo). Separarlos mantiene ambos por debajo del gate de 300 líneas sin partir
 * ningún concepto por la mitad.
 */
/**
 * Un BLOQUE del ecosistema: la unidad por la que se agrupan catálogo, endpoints y salud.
 *
 * El catálogo mostraba sólo Atlas Backend porque era el único que sabía describirse a sí mismo. Los
 * otros dos bloques publican ahora su manifiesto y el backend lo federa; `federationStatus` dice si
 * eso funcionó, y por eso un bloque con cero tablas ya no es ambiguo.
 */
export type PlatformBlock = {
  systemCode: string;
  name: string;
  repository: string;
  kind: "SELF" | "FEDERATED" | string;
  purpose: string;
  endpoints: number;
  dataEntities: number;
  federationStatus: string;
  lastSuccessAt: string | null;
};

export type NetworkBlockHealth = {
  systemCode: string;
  name: string;
  repository: string;
  kind: string;
  purpose: string;
  degradation: string;
  liveState: "UP" | "DOWN" | "DEGRADED" | "NOT_CONFIGURED" | string;
  healthMessage: string;
  isCritical: boolean;
  catalog: {
    endpoints: number;
    dataEntities: number;
    federationStatus: string;
    /**
     * Si los contadores son una medición. Falta en backends anteriores: entonces se deduce de
     * `lastSuccessAt` (ver `isCatalogMeasured`).
     */
    measured?: boolean;
    federationMessage: string | null;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    remoteVersion: string | null;
    remoteCommit: string | null;
  };
};

export type NetworkHealth = {
  generatedAt: string;
  overallState: string;
  blocksUp: number;
  blocksDown: number;
  blocksNotConfigured: number;
  blocks: NetworkBlockHealth[];
};

export type FederationOutcome = {
  systemCode: string;
  status: string;
  message: string;
  endpointsImported: number;
  dataEntitiesImported: number;
  remoteVersion: string | null;
  remoteCommit: string | null;
};

export type ActiveArtifactTrafficRule = {
  segmentKey: string | null;
  trafficPercentage: number | null;
  priority: number | null;
};

/** Un artefacto del motor de decisión con el despliegue ACTIVO que lo hace vigente. */
export type ActiveArtifact = {
  deploymentId: string;
  artifactCode: string;
  artifactName: string;
  artifactType: string | null;
  ownerTeam: string | null;
  versionNumber: number | null;
  semanticVersion: string | null;
  versionStatus: string | null;
  environmentCode: string;
  deploymentStatus: string;
  deploymentMode: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  deployedBy: string;
  deployedAt: string;
  lastValidatedAt: string | null;
  trafficRules: ActiveArtifactTrafficRule[];
};

export type ActiveArtifactReport = {
  generatedAt: string;
  status: string;
  message: string;
  environmentFilter: string | null;
  items: ActiveArtifact[];
  /**
   * El motor sirve como mucho 100 por página y el servidor lee una: `true` si el motor dijo tener
   * más de lo que llegó. Opcionales: un servidor anterior al 2026-09-29 no los manda.
   */
  truncated?: boolean;
  deploymentsTotal?: number | null;
};

/** Semáforo del informador del servidor (mismos valores que `systems-monitor.rules` del backend). */
export type MonitorStatus = "ok" | "warn" | "bad" | "unknown";

export type HostAppState = {
  name: string;
  /** `healthy | unhealthy | starting | none | ausente`. */
  principal: string;
  /** Salud del respaldo, o `null` si la app no tiene respaldo. */
  respaldo: string | null;
  memoryPct: number | null;
};

/** Instantánea del servidor de TEST que manda el informador cada 5 min. */
export type HostSnapshot = {
  capturedAt: string;
  ramAvailableMb: number;
  ramTotalMb: number;
  swapFreeMb: number;
  swapTotalMb: number;
  load1: number;
  load15: number;
  cores: number;
  diskPct: number;
  buildCacheGb: number;
  backupAgeHours: number | null;
  apps: HostAppState[];
};

export type HostStatusReport =
  | { available: false }
  | {
      available: true;
      ageMinutes: number;
      snapshot: HostSnapshot;
      status: {
        ram: MonitorStatus;
        disk: MonitorStatus;
        load: MonitorStatus;
        backup: MonitorStatus;
        stale: boolean;
        overall: MonitorStatus;
      };
    };
