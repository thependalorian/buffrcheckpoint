import { z } from "zod";

/**
 * Buffr Checkpoint visit roster row.
 *
 * Default front-desk views should show only what an operator needs to operate safely.
 * Phone numbers, national IDs, photos, and free-text notes are excluded from the
 * default table response and revealed only where role and workflow require them.
 */
export const visitRosterRowSchema = z.object({
  visitId: z.string().uuid(),
  siteId: z.string().uuid(),
  visitorDisplayName: z.string(),
  visitorTypeCode: z.string(),
  hostDisplayName: z.string().nullable(),
  assuranceLevelCode: z.string(),
  visitStatusCode: z.string(),
  checkedInAt: z.string().datetime(),
  checkedOutAt: z.string().datetime().nullable(),
  offlineCaptured: z.boolean(),
  requiresAction: z.boolean(),
});

export type VisitRosterRow = z.infer<typeof visitRosterRowSchema>;
