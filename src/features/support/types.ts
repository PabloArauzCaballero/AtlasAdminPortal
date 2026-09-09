/**
 * El contrato de `internal/support/*`, que hasta ahora no consumía ningún frontend.
 *
 * La paginación NO es por página sino por cursor `(openedAt, id)`: el backlog de soporte crece sin
 * techo y con OFFSET un caso nuevo desplaza todo lo que el agente estaba mirando. Por eso aquí no
 * hay `PaginatedResponse` ni `meta.total` — hay `nextCursor` o no lo hay.
 */
export type SupportCursor = {
  openedAt: string;
  id: string;
};

export type SupportCase = {
  caseId: string;
  caseNumber: string;
  title: string;
  caseType: string;
  domain: string;
  status: string;
  customerStatus: string;
  openedAt: string;
  lastActivityAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  internalStatus: string;
  priority: string;
  impact: string;
  urgency: string;
  sensitivity: string;
  queueId: string | null;
  categoryId: string | null;
  assigneeAgentId: string | null;
  subjectContextType: string;
  subjectCustomerId: string | null;
  subjectPartnerProfileId: string | null;
  internalSummary: string | null;
  escalationLevel: number;
  transferCount: number;
  legalHold: boolean;
  retentionClassCode: string | null;
  originContext: Record<string, unknown> | null;
};

export type SupportCaseListResponse = {
  cases: SupportCase[];
  nextCursor: SupportCursor | null;
};

export type SupportChannel = {
  channelId: string;
  caseId: string | null;
  status: string;
  channelType: string;
  queueId: string | null;
  assignedAgentId: string | null;
  requestedAt: string | null;
  lastMessageAt: string | null;
};

export type SupportCaseEvent = {
  eventId: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  occurredAt: string;
  payload: Record<string, unknown> | null;
};

export type SupportAssignment = {
  assignmentId: string;
  agentProfileId: string | null;
  queueId: string | null;
  assignedAt: string | null;
  releasedAt: string | null;
  assignmentReason: string | null;
};

export type SupportCaseDetail = SupportCase & {
  channels?: SupportChannel[];
};

export type SupportCaseTimeline = {
  events: SupportCaseEvent[];
  assignments: SupportAssignment[];
};

/** El motivo tal como lo ve quien clasifica: con la cola y la sensibilidad a las que manda. */
export type SupportCategory = {
  categoryCode: string;
  categoryId: string;
  label: string;
  description: string | null;
  requiresSpecialist: boolean;
  audience: string;
  domain: string;
  defaultCaseType: string | null;
  sensitivity: string;
  defaultQueueId: string | null;
  defaultImpact: string;
  defaultUrgency: string;
  catalogVersion: number;
  subcategories?: SupportCategory[];
};

export type SupportQueue = {
  queueId: string;
  queueCode: string;
  name: string;
  description: string | null;
  contextType: string;
  defaultPriority: string;
  slaPolicyCode: string | null;
  skillsRequired: string[];
};

export type SupportCodeOption = {
  code: string;
  label: string;
};

export type SupportCodes = {
  resolutionCodes: SupportCodeOption[];
  rootCauseCodes: SupportCodeOption[];
  priorities: SupportCodeOption[];
  caseTypes: string[];
  impacts: string[];
  urgencies: string[];
};

export type SupportAgentProfile = {
  agentProfileId: string;
  internalUserId: string;
  email: string | null;
  fullName: string | null;
  roleCode: string | null;
  supportLevel: string;
  defaultQueueId: string | null;
  maxConcurrentChannels: number;
  activeChannelCount: number;
  presenceState: string;
  employmentStatus: string;
  isActive: boolean;
};

export type TriageInput = {
  categoryCode?: string;
  caseType?: string;
  priority?: string;
  queueCode?: string;
  internalSummary?: string;
  reason: string;
};

export type AssignInput = {
  agentProfileId?: string;
  queueCode?: string;
  reason: string;
};

export type EscalateInput = {
  escalationType:
    "FUNCTIONAL" | "HIERARCHICAL" | "SECURITY" | "FRAUD" | "PRIVACY";
  targetQueueCode?: string;
  reason: string;
  notifyCustomer?: boolean;
};

export type ResolveInput = {
  resolutionCode: string;
  rootCauseCode: string;
  customerResolution: string;
  internalResolution: string;
  workaroundDescription?: string;
};

export type CloseInput = {
  reason: string;
};

export type CreateAgentInput = {
  internalUserId: string;
  supportLevel: string;
  queueCode?: string;
  maxConcurrentChannels: number;
};
