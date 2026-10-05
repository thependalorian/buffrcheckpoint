import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { platformNotificationTemplate, platformNotificationTemplateStatusLog, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface UpdateTemplateInput {
  subject?: string | null;
  body?: string;
  note?: string;
}

/**
 * Subject/body for the notification copy the backend sends, editable from
 * the Ops Console instead of living as string literals inside service
 * files. Deliberately thin: `{{token}}` substitution only — no conditionals,
 * no loops, no template engine. A caller always passes a fallback so an
 * unseeded template can never break a send path.
 */
@Injectable()
export class PlatformNotificationTemplateService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async list() {
    const rows = await this.db
      .select({
        id: platformNotificationTemplate.id,
        templateCode: typeDefinition.code,
        templateLabel: typeDefinition.label,
        subject: platformNotificationTemplate.subject,
        body: platformNotificationTemplate.body,
        updatedAt: platformNotificationTemplate.updatedAt,
        updatedBy: platformNotificationTemplate.updatedBy,
      })
      .from(platformNotificationTemplate)
      .innerJoin(typeDefinition, eq(platformNotificationTemplate.templateCode, typeDefinition.id))
      .where(isNull(platformNotificationTemplate.deletedAt))
      .orderBy(typeDefinition.sortOrder);
    return rows;
  }

  async changeLog(templateId: string) {
    return this.db.query.platformNotificationTemplateStatusLog.findMany({
      where: eq(platformNotificationTemplateStatusLog.templateId, templateId),
      orderBy: desc(platformNotificationTemplateStatusLog.occurredAt),
      limit: 50,
    });
  }

  async update(templateId: string, input: UpdateTemplateInput, user: AuthenticatedUser) {
    const existing = await this.db.query.platformNotificationTemplate.findFirst({
      where: and(eq(platformNotificationTemplate.id, templateId), isNull(platformNotificationTemplate.deletedAt)),
    });
    if (!existing) throw new NotFoundException("Notification template not found");

    const body = input.body?.trim();
    const patch: Partial<typeof platformNotificationTemplate.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: user.userId,
    };
    if (input.subject !== undefined) patch.subject = input.subject?.trim() || null;
    if (body) patch.body = body;

    await this.db
      .update(platformNotificationTemplate)
      .set(patch)
      .where(eq(platformNotificationTemplate.id, templateId));

    await this.db.insert(platformNotificationTemplateStatusLog).values({
      id: randomUUID(),
      templateId,
      eventTypeCode: await this.typeDefs.id("platform_config_change_event_type", "updated"),
      actorId: user.userId,
      beforeValue: { subject: existing.subject, body: existing.body },
      afterValue: { subject: patch.subject ?? existing.subject, body: patch.body ?? existing.body },
      note: input.note,
    });

    const row = await this.db.query.platformNotificationTemplate.findFirst({
      where: eq(platformNotificationTemplate.id, templateId),
    });
    return row ?? null;
  }

  /**
   * Renders a template for a send path. `fallback` is what the code used to
   * hardcode — a missing or soft-deleted template row degrades to the old
   * behaviour rather than dropping the notification.
   */
  async render(
    templateCode: string,
    variables: Record<string, string>,
    fallback: { subject: string; body: string },
  ): Promise<{ subject: string; body: string }> {
    const row = await this.findByCode(templateCode);
    const subject = row?.subject ?? fallback.subject;
    const body = row?.body ?? fallback.body;
    return { subject: substitute(subject, variables), body: substitute(body, variables) };
  }

  private async findByCode(templateCode: string) {
    const codeId = await this.typeDefs.id("notification_template_code", templateCode).catch(() => null);
    if (!codeId) return null;
    const emailChannel = await this.typeDefs.id("notification_channel", "email").catch(() => null);
    if (!emailChannel) return null;
    return (
      (await this.db.query.platformNotificationTemplate.findFirst({
        where: and(
          eq(platformNotificationTemplate.templateCode, codeId),
          eq(platformNotificationTemplate.channelCode, emailChannel),
          isNull(platformNotificationTemplate.deletedAt),
        ),
      })) ?? null
    );
  }
}

/** `{{name}}` -> variables.name. Unknown tokens are left as-is so a typo in an edited template is visible, not silently blank. */
function substitute(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => variables[key] ?? match);
}
