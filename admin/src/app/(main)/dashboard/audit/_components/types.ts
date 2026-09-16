export interface AuditEventRow {
  id: string;
  actionCode: string;
  resourceType: string;
  resourceId: string | null;
  occurredAt: string;
  eventHash: string;
}

export interface AuditEventPage {
  events: AuditEventRow[];
  nextCursor: string | null;
}
