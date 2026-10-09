import { SetMetadata } from "@nestjs/common";

export const AUDIT_LOG_KEY = "auditLog";

export interface AuditLogMetadata {
  action: string;
  resourceType: string;
  /**
   * Write the audit event before the handler runs, so a failed audit write stops the action (LG-3, fail closed).
   * Use it for exports, deletions, money movements and access changes. The event then records the attempt, and its resource is taken
   * from the route parameters because the result does not exist yet. Without it the event is written after the handler succeeds.
   */
  writeAhead?: boolean;
}

// Applied to any controller method that is a "sensitive read, export,
// correction, or deletion" per Section 9.2 rule 3. AuditInterceptor reads
// this metadata and writes an audit_event row after the handler succeeds.
export const AuditLog = (metadata: AuditLogMetadata) => SetMetadata(AUDIT_LOG_KEY, metadata);
