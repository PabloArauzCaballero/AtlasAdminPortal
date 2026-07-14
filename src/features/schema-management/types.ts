export type SchemaVersion = {
  _id: string;
  versionCode: string;
  createdAt: string;
  createdByPlatformUserId: string | null;
  notes: string | null;
  isActive: boolean;
  parentVersionId: string | null;
  tablesCount: number;
  columnsCount: number;
  relationshipsCount: number;
};

export type SchemaTableType =
  "transactional" | "catalog" | "audit" | "operational";

export type SchemaColumn = {
  _id: string;
  columnName: string;
  columnType: string;
  isNullable: boolean;
  isImmutable: boolean;
  isPii: boolean;
  isIndexed: boolean;
  description: string | null;
};

export type SchemaRelationship = {
  _id: string;
  sourceColumnName: string;
  targetTableName: string;
  targetColumnName: string;
  cascadeDelete: boolean;
  isImmutable: boolean;
};

export type SchemaTable = {
  _id: string;
  schemaVersionId: string;
  tableName: string;
  tableType: SchemaTableType;
  isAppendOnly: boolean;
  isTenantScoped: boolean;
  description: string | null;
  columnsCount: number;
  relationshipsCount: number;
  createdAt: string;
  columns?: SchemaColumn[];
  relationships?: SchemaRelationship[];
};

export type SchemaChangeApprovalStatus = "pending" | "approved" | "rejected";

export type SchemaChangeLog = {
  _id: string;
  changeId: string;
  schemaVersionId: string | null;
  changeType: string;
  affectedEntityType: string;
  affectedEntityId: string | null;
  changePayload: Record<string, unknown>;
  approvalStatus: SchemaChangeApprovalStatus;
  requesterPlatformUserId: string;
  approvedByPlatformUserId: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  changeResult: "pending" | "success" | "failed" | "rejected" | null;
  errorMessage: string | null;
  createdAt: string;
  rolledBack: boolean;
};

export type ApprovalResult = {
  _id: string;
  changeId: string;
  approvalStatus: "approved" | "rejected";
  approvedAt: string;
  changeResult: "success" | "failed" | "pending";
  errorMessage: string | null;
  message: string;
};

export type OffsetListResponse<T, ExtraKey extends string, Extra> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
} & Record<ExtraKey, Extra>;

export type NewColumnInput = {
  columnName: string;
  columnType: string;
  isNullable: boolean;
  isImmutable: boolean;
  isPii: boolean;
  isIndexed: boolean;
  defaultValue?: string;
  description?: string;
};

export type NewRelationshipInput = {
  sourceColumnName: string;
  targetTableName: string;
  targetColumnName: string;
  cascadeDelete: boolean;
};

export type ProposeSchemaTableInput = {
  tableName: string;
  tableType: SchemaTableType;
  isAppendOnly: boolean;
  isTenantScoped: boolean;
  description?: string;
  columns: NewColumnInput[];
  relationships: NewRelationshipInput[];
  justification: string;
};

export type ApproveSchemaChangeInput = {
  approval: "approve" | "reject";
  approvalNotes?: string;
};
