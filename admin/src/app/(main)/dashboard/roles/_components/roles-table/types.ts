/**
 * Buffr Checkpoint RBAC catalogue.
 *
 * The Roles page must fetch role labels, permitted actions, assignment counts,
 * last review, and scope from the backend. It must not import a static roles.ts file.
 *
 * Customer-side human roles (Section 9.1a):
 *   owner_operator, front_desk_operator, host_staff, site_manager,
 *   regional_manager, compliance_audit_officer, system_administrator, auditor
 *
 * Not normal customer-side roles:
 *   Visitor (visitor workflow), DigiNam verification adapter (service principal),
 *   Platform Support (internal control plane), Background worker (service identity)
 */

export type BuffrRole = {
  roleCode: string;
  roleLabel: string;
  release: string;
  scopeType: "organisation" | "region" | "site" | "zone";
  assignmentCount: number;
  permittedActions: string[];
  lastReview: string | null;
  reviewStatus: "active" | "pending_review" | "expired";
};

// Static role demo data removed — no fake roles may ship in the Buffr Checkpoint
// admin application. Populate from GET /roles?organisationId=... responses.
