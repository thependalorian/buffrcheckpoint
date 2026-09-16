import { SetMetadata } from "@nestjs/common";

export const AUDIT_LOG_KEY = "auditLog";

export interface AuditLogMetadata {
  action: string;
  resourceType: string;
}

// Applied to any controller method that is a "sensitive read, export,
// correction, or deletion" per Section 9.2 rule 3. AuditInterceptor reads
// this metadata and writes an audit_event row after the handler succeeds.
export const AuditLog = (metadata: AuditLogMetadata) => SetMetadata(AUDIT_LOG_KEY, metadata);
