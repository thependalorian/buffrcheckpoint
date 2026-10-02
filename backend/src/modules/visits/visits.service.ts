import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { and, desc, eq, gte, inArray, isNull, lt, lte, or, type SQL } from "drizzle-orm";

import { resolvePublicAssetUrl } from "../../common/assets/public-asset-url";
import { isVisitStatusCode } from "../../common/canonical-codes";
import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { VISIT_CHECKED_IN_EVENT, VisitCheckedInEvent } from "../../common/domain-events/visit-checked-in.event";
import {
  VISIT_ROSTER_CHANGED_EVENT,
  VisitRosterChangedEvent,
  type VisitRosterChangeReason,
} from "../../common/domain-events/visit-roster-changed.event";
import type { TabularExport } from "../../common/export/tabular";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  securityZones,
  siteHosts,
  sites,
  typeDefinition,
  visitFormAnswers,
  visitInvitations,
  visitorPersonalData,
  visitorSubjects,
  visitorVisits,
  visitStatusEvents,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { InvitationsService } from "../invitations/invitations.service";
import { KioskExperienceService } from "../kiosk-experience/kiosk-experience.service";
import { buildHostNotificationHtml } from "../notifications/host-notification-email";
import { SiteBrandingService } from "../site-branding/site-branding.service";
import { SiteQrReferencesService } from "../site-qr-references/site-qr-references.service";
import { createSurveyToken } from "../visit-survey/survey-token";
import { VisitorDataMinimisationService } from "../visitor-policy/visitor-data-minimisation.service";
import { VisitorPolicyService } from "../visitor-policy/visitor-policy.service";
import { VisitorWaitQueueService } from "../visitor-wait-queue/visitor-wait-queue.service";
import type { CheckInDto } from "./dto/check-in.dto";
import type { PublicCheckInDto, PublicCheckOutDto } from "./dto/public-check-in.dto";
import { resolveVisitorNextSteps } from "./visitor-next-steps";
import { randomUUID } from "node:crypto";

export interface VisitRosterRow {
  visitId: string;
  siteId: string;
  visitorDisplayName: string;
  visitorTypeCode: string;
  hostDisplayName: string | null;
  assuranceLevelCode: string;
  visitStatusCode: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  offlineCaptured: boolean;
  requiresAction: boolean;
}

export interface PublicCheckInBranding {
  organisationDisplayName: string | null;
  siteDisplayName: string | null;
  welcomeMessage: string | null;
  brandColourToken: string | null;
  logoUrl: string | null;
  helpContactReference: string | null;
  brandingScope: "site" | "organisation";
}

export interface PublicCheckInContext {
  siteId: string;
  siteName: string;
  referenceId: string;
  label: string;
  hosts: Array<{ id: string; displayName: string; department: string | null }>;
  purposeCategories: Array<{ code: string; label: string }>;
  visitorTypes: Array<{ code: string; label: string }>;
  privacyNoticeSummary: string;
  branding: PublicCheckInBranding | null;
}

@Injectable()
export class VisitsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly dataProtection: PersonalDataProtectionService,
    private readonly events: EventEmitter2,
    private readonly kioskExperience: KioskExperienceService,
    private readonly siteBranding: SiteBrandingService,
    private readonly siteQrReferences: SiteQrReferencesService,
    private readonly invitations: InvitationsService,
    private readonly waitQueue: VisitorWaitQueueService,
    private readonly visitorPolicy: VisitorPolicyService,
    private readonly dataMinimisation: VisitorDataMinimisationService,
  ) {}

  // Section 8.1/8.5's walk-in and offline journeys. Idempotent: a retried
  // sync with the same client-generated id (dto.id) must never create a
  // second visit or double-notify a host — Section 8.5's explicit
  // requirement. onConflictDoNothing + checking whether a row was actually
  // returned is how we tell "created just now" apart from "already existed."
  async checkIn(dto: CheckInDto, user: AuthenticatedUser) {
    return this.insertCheckIn(dto, user);
  }

  /** Unauthenticated invitation QR — opaque token only, no PII in QR payload. */
  async publicInvitationCheckIn(dto: {
    id: string;
    token: string;
    visitorName: string;
    visitorPhone?: string;
    purposeCategoryCode?: string;
  }) {
    const resolved = await this.invitations.resolvePublicToken(dto.token);
    const invitation = await this.db.query.visitInvitations.findFirst({
      where: and(eq(visitInvitations.id, resolved.invitationId), isNull(visitInvitations.deletedAt)),
    });
    if (!invitation) throw new NotFoundException("Invitation not found");

    const systemUser: AuthenticatedUser = {
      userId: "00000000-0000-0000-0000-000000000001",
      organisationId: invitation.organisationId,
      siteId: invitation.siteId,
      roleCode: "system",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
      audience: "admin",
    };

    return this.insertCheckIn(
      {
        id: dto.id,
        siteId: invitation.siteId,
        hostId: invitation.hostId,
        visitorName: dto.visitorName,
        visitorPhone: dto.visitorPhone,
        visitorTypeCode: "general",
        purposeCategoryCode: dto.purposeCategoryCode,
        captureChannelCode: "qr",
        invitationId: invitation.id,
        checkedInAt: new Date().toISOString(),
        offlineCaptured: false,
      },
      systemUser,
    );
  }

  /** Unauthenticated mobile QR journey — site+ref must be an active public check-in QR. */
  async getPublicCheckInContext(siteId: string, referenceId: string): Promise<PublicCheckInContext> {
    const validated = await this.siteQrReferences.validatePublicCheckInReference(siteId, referenceId);

    const hostRows = await this.db.query.siteHosts.findMany({
      where: and(
        eq(siteHosts.organisationId, validated.organisationId),
        eq(siteHosts.siteId, validated.siteId),
        eq(siteHosts.active, true),
        isNull(siteHosts.deletedAt),
      ),
    });

    const hosts = hostRows
      .map((host) => {
        let displayName = "Host";
        if (host.hostNameProtected) {
          try {
            displayName = this.dataProtection.decrypt(host.hostNameProtected as ProtectedPersonalDataEnvelope);
          } catch {
            displayName = "Host";
          }
        }
        return { id: host.id, displayName, department: host.department };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const [purposeRows, visitorTypeRows] = await Promise.all([
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "purpose_category"), isNull(typeDefinition.deletedAt)),
      }),
      this.db.query.typeDefinition.findMany({
        where: and(eq(typeDefinition.domain, "visitor_type"), isNull(typeDefinition.deletedAt)),
      }),
    ]);
    const purposeCategories = purposeRows
      .map((row) => ({ code: row.code, label: row.label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const visitorTypes = visitorTypeRows
      .map((row) => ({ code: row.code, label: row.label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const branding = await this.resolvePublicBranding(validated.organisationId, validated.siteId);
    const displaySiteName = branding?.siteDisplayName || validated.siteName;

    return {
      siteId: validated.siteId,
      siteName: displaySiteName,
      referenceId: validated.referenceId,
      label: validated.label,
      hosts,
      purposeCategories,
      visitorTypes,
      privacyNoticeSummary:
        "By checking in you acknowledge that your visit details (name, contact, organisation, host, and purpose) are processed for site security, host notification, and retention under this site's visitor policy.",
      branding,
    };
  }

  async getPublicCheckInForm(siteId: string, referenceId: string, visitorTypeCode: string, languageCode?: string) {
    const validated = await this.siteQrReferences.validatePublicCheckInReference(siteId, referenceId);
    return this.visitorPolicy.resolveEffectiveForm(
      validated.organisationId,
      validated.siteId,
      visitorTypeCode.trim() || "general",
      languageCode,
    );
  }

  async publicCheckIn(dto: PublicCheckInDto) {
    const validated = await this.siteQrReferences.validatePublicCheckInReference(dto.siteId, dto.referenceId);

    const host = await this.db.query.siteHosts.findFirst({
      where: and(
        eq(siteHosts.id, dto.hostId),
        eq(siteHosts.organisationId, validated.organisationId),
        eq(siteHosts.siteId, validated.siteId),
        eq(siteHosts.active, true),
        isNull(siteHosts.deletedAt),
      ),
    });
    if (!host) throw new BadRequestException("Selected host is not available at this site");

    let zoneId = dto.zoneId;
    if (!zoneId) {
      const gatedZones = await this.db.query.securityZones.findMany({
        where: and(
          eq(securityZones.organisationId, validated.organisationId),
          eq(securityZones.siteId, validated.siteId),
          eq(securityZones.hostApprovalRequired, true),
          isNull(securityZones.deletedAt),
        ),
      });
      if (gatedZones.length === 1) {
        zoneId = gatedZones[0].id;
      }
    }

    let hostDisplayName = "your host";
    if (host.hostNameProtected) {
      try {
        hostDisplayName = this.dataProtection.decrypt(host.hostNameProtected as ProtectedPersonalDataEnvelope);
      } catch {
        hostDisplayName = "your host";
      }
    }
    const hostDepartment = host.department?.trim() || null;

    const systemUser: AuthenticatedUser = {
      userId: "00000000-0000-0000-0000-000000000001",
      organisationId: validated.organisationId,
      siteId: validated.siteId,
      roleCode: "system",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
      audience: "admin",
    };

    const branding = await this.resolvePublicBranding(validated.organisationId, validated.siteId);
    const displaySiteName = branding?.siteDisplayName || validated.siteName;

    const visit = await this.insertCheckIn(
      {
        id: dto.id,
        siteId: dto.siteId,
        zoneId,
        hostId: dto.hostId,
        visitorName: dto.visitorName,
        visitorPhone: dto.visitorPhone,
        companyName: dto.companyName,
        visitorEmail: dto.visitorEmail,
        vehicleRegistration: dto.vehicleRegistration,
        idDocumentNumber: dto.idDocumentNumber,
        visitorTypeCode: dto.visitorTypeCode,
        purposeCategoryCode: dto.purposeCategoryCode,
        captureChannelCode: "qr",
        checkedInAt: new Date().toISOString(),
        offlineCaptured: false,
        formAnswers: dto.formAnswers,
        languageCode: dto.languageCode,
      },
      systemUser,
    );

    const visitorName = dto.visitorName.trim();
    const firstName = visitorName.split(/\s+/)[0] || visitorName;
    const queue = "queue" in visit ? visit.queue : null;
    const nextSteps = resolveVisitorNextSteps({
      visitorFirstName: firstName,
      hostDisplayName,
      hostDepartment,
      visitorTypeCode: dto.visitorTypeCode,
      queueNumber: queue?.queueNumber ?? null,
      peopleAhead: queue?.peopleAhead ?? null,
    });
    const confirmationCode = visit.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    return {
      visitId: visit.id,
      confirmationCode,
      siteId: visit.siteId,
      siteName: displaySiteName,
      visitorName,
      hostDisplayName: nextSteps.hostDisplayName,
      hostDepartment: nextSteps.hostDepartment,
      organisationDisplayName: branding?.organisationDisplayName ?? null,
      welcomeMessage: branding?.welcomeMessage ?? null,
      brandColourToken: branding?.brandColourToken ?? null,
      checkedInAt: visit.checkedInAt.toISOString(),
      visitorPass: {
        confirmationCode,
        title: nextSteps.badgeRequired ? "Visitor pass" : "Visit confirmation",
        visitorName,
        hostLine: nextSteps.hostDepartment
          ? `${nextSteps.hostDisplayName} · ${nextSteps.hostDepartment}`
          : nextSteps.hostDisplayName,
        siteName: displaySiteName,
        badgeRequired: nextSteps.badgeRequired,
        badgeInstruction: nextSteps.badgeInstruction,
        queueNumber: nextSteps.queueNumber,
        printHint: "Show this screen at reception, or ask reception to print a temporary pass.",
      },
      nextSteps: {
        headline: nextSteps.headline,
        instruction: nextSteps.instruction,
        waitLocation: nextSteps.waitLocation,
        badgeRequired: nextSteps.badgeRequired,
        badgeInstruction: nextSteps.badgeInstruction,
        queueNumber: nextSteps.queueNumber,
        peopleAhead: nextSteps.peopleAhead,
        confirmationCode,
      },
    };
  }

  private async resolvePublicBranding(organisationId: string, siteId: string): Promise<PublicCheckInBranding | null> {
    const bundle = await this.siteBranding.getPublishedForOrganisationSite(organisationId, siteId);
    if (!bundle?.version) return null;
    const { version } = bundle;
    return {
      organisationDisplayName: version.organisationDisplayName ?? null,
      siteDisplayName: version.siteDisplayName ?? null,
      welcomeMessage: version.welcomeMessage ?? null,
      brandColourToken: version.brandColourToken ?? null,
      logoUrl: resolvePublicAssetUrl(version.logoArtifactId),
      helpContactReference: version.helpContactReference ?? null,
      brandingScope: bundle.brandingScope,
    };
  }

  private async insertCheckIn(dto: CheckInDto, user: AuthenticatedUser) {
    const siteRow = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, dto.siteId), eq(sites.organisationId, user.organisationId)),
    });
    if (!siteRow) {
      throw new ForbiddenException("Site does not belong to your organisation");
    }

    // Validate form answers before any visit / PII writes so a failed
    // minimisation check cannot leave an orphan checked-in visit.
    const effectiveForm = await this.visitorPolicy.resolveEffectiveForm(
      user.organisationId,
      dto.siteId,
      dto.visitorTypeCode,
      dto.languageCode,
    );
    const validatedAnswers = this.dataMinimisation.validateCheckInAnswers({
      form: effectiveForm
        ? {
            formVersionId: effectiveForm.formVersionId,
            fields: effectiveForm.fields.map((f) => ({
              fieldCode: f.fieldCode,
              fieldLabel: f.fieldLabel,
              required: f.required,
              dataClassificationCode: f.dataClassificationCode,
              visibilityRule: f.visibilityRule,
              validationSchema: f.validationSchema,
            })),
          }
        : null,
      formAnswers: dto.formAnswers,
    });

    // A first-time walk-in with no visitorId gets a real visitor_subjects/
    // visitor_personal_data row created here, so the roster has a real
    // display name — Slice 1's own "complete core check-in" requirement,
    // not previously wired (visitorId was accepted but nothing ever
    // populated it for a fresh visitor).
    let visitorId = dto.visitorId ?? null;
    if (!visitorId && (dto.visitorName || dto.visitorPhone)) {
      visitorId = randomUUID();
      await this.db.insert(visitorSubjects).values({ id: visitorId, organisationId: user.organisationId });
      await this.db.insert(visitorPersonalData).values({
        visitorId,
        encryptedPayload: this.dataProtection.encrypt(
          JSON.stringify({
            name: dto.visitorName,
            phone: dto.visitorPhone,
            company: dto.companyName ?? null,
            email: dto.visitorEmail ?? null,
            vehicleRegistration: dto.vehicleRegistration ?? null,
            idDocumentNumber: dto.idDocumentNumber ?? null,
          }),
        ),
        nameLookupHmac: dto.visitorName ? this.dataProtection.lookupHmac(dto.visitorName, "NAME_HASH_PEPPER") : null,
        phoneLookupHmac: dto.visitorPhone
          ? this.dataProtection.lookupHmac(dto.visitorPhone, "PHONE_HASH_PEPPER")
          : null,
      });
    }

    const [visitorCategoryCode, arrivalChannelCode, checkedInStatus, pendingApprovalStatus] = await Promise.all([
      this.typeDefs.id("visitor_type", dto.visitorTypeCode),
      this.typeDefs.id("capture_channel", dto.captureChannelCode),
      this.typeDefs.id("visit_status", "checked_in"),
      this.typeDefs.id("visit_status", "pending_approval"),
    ]);
    const purposeCategoryCode = dto.purposeCategoryCode
      ? await this.typeDefs.id("purpose_category", dto.purposeCategoryCode)
      : null;

    // Zone-level host gate (§8 / security_zones.host_approval_required) —
    // applies equally to kiosk and public phone-QR check-in so approve/reject
    // is reachable without waiting on escalation hold_entry.
    let initialStatus = checkedInStatus;
    if (dto.zoneId) {
      const zone = await this.db.query.securityZones.findFirst({
        where: and(
          eq(securityZones.id, dto.zoneId),
          eq(securityZones.organisationId, user.organisationId),
          eq(securityZones.siteId, dto.siteId),
          isNull(securityZones.deletedAt),
        ),
      });
      if (zone?.hostApprovalRequired) {
        initialStatus = pendingApprovalStatus;
      }
    }

    const experienceSnapshot = await this.kioskExperience.resolveSnapshotIds(dto.siteId, undefined, user);

    const inserted = await this.db
      .insert(visitorVisits)
      .values({
        id: dto.id,
        organisationId: user.organisationId,
        siteId: dto.siteId,
        zoneId: dto.zoneId ?? null,
        visitorId,
        hostId: dto.hostId,
        visitorCategoryCode,
        invitationId: dto.invitationId ?? null,
        purposeCategoryCode,
        arrivalChannelCode,
        statusCode: initialStatus,
        checkedInAt: new Date(dto.checkedInAt),
        serverAcceptedAt: new Date(),
        offlineCaptured: dto.offlineCaptured ?? false,
        retentionPolicyVersion: 1,
        brandingProfileVersionId: experienceSnapshot.brandingProfileVersionId,
        kioskExperienceConfigurationVersionId: experienceSnapshot.kioskExperienceConfigurationVersionId,
      })
      .onConflictDoNothing({ target: visitorVisits.id })
      .returning();

    const wasNewlyCreated = inserted.length > 0;

    if (wasNewlyCreated) {
      await this.db.insert(visitStatusEvents).values({
        id: randomUUID(),
        visitId: dto.id,
        toStatusCode: initialStatus,
        occurredAt: new Date(),
        actorId: user.roleCode === "system" ? null : user.userId,
      });

      if (dto.invitationId) {
        await this.invitations.matchAtCheckIn(dto.invitationId, user);
      }

      if (validatedAnswers.length) {
        await this.db.insert(visitFormAnswers).values(
          validatedAnswers.map((answer) => ({
            id: randomUUID(),
            organisationId: user.organisationId,
            visitId: dto.id,
            formVersionId: answer.formVersionId,
            fieldCode: answer.fieldCode,
            answerValue: answer.answerValue ?? {},
            fieldLabelSnapshot: answer.fieldLabelSnapshot ?? null,
          })),
        );
      }
      // Host row first — unit link feeds wait queue; contact feeds email.
      const hostRow = await this.db.query.siteHosts.findFirst({ where: eq(siteHosts.id, dto.hostId) });

      // Reception wait queue (Operational Services) — distinct from offline outbox.
      let queue: {
        queueEntryId: string;
        queueNumber: number;
        positionAtEnqueue: number;
        peopleAhead: number;
      } | null = null;
      try {
        queue = await this.waitQueue.enqueueForVisit({
          organisationId: user.organisationId,
          siteId: dto.siteId,
          visitId: dto.id,
          hostId: dto.hostId,
          organisationUnitId: hostRow?.organisationUnitId ?? null,
          actorId: user.userId,
        });
      } catch {
        queue = null;
      }

      // Section 8.8 host notification — email via Resend when configured;
      // Communication analogue (BIAN Business Support or custom tree).
      const hostContact = hostRow?.hostContactProtected
        ? this.dataProtection.decrypt(hostRow.hostContactProtected as ProtectedPersonalDataEnvelope)
        : null;
      if (hostContact) {
        const siteRowForNotify = await this.db.query.sites.findFirst({
          where: and(eq(sites.id, dto.siteId), eq(sites.organisationId, user.organisationId)),
        });
        const [purposeLabel, visitorTypeLabel] = await Promise.all([
          dto.purposeCategoryCode
            ? this.db.query.typeDefinition
                .findFirst({
                  where: and(
                    eq(typeDefinition.domain, "purpose_category"),
                    eq(typeDefinition.code, dto.purposeCategoryCode),
                    isNull(typeDefinition.deletedAt),
                  ),
                })
                .then((row) => row?.label ?? dto.purposeCategoryCode)
            : Promise.resolve(null),
          this.db.query.typeDefinition
            .findFirst({
              where: and(
                eq(typeDefinition.domain, "visitor_type"),
                eq(typeDefinition.code, dto.visitorTypeCode),
                isNull(typeDefinition.deletedAt),
              ),
            })
            .then((row) => row?.label ?? dto.visitorTypeCode),
        ]);

        const visitorName = dto.visitorName?.trim() || "A visitor";
        const siteLabel = siteRowForNotify?.name ?? "reception";
        const detailParts = [
          visitorTypeLabel ? `Visitor type: ${visitorTypeLabel}` : null,
          dto.companyName?.trim() ? `Organisation: ${dto.companyName.trim()}` : null,
          purposeLabel ? `Purpose: ${purposeLabel}` : null,
          dto.visitorPhone?.trim() ? `Mobile: ${dto.visitorPhone.trim()}` : null,
          dto.visitorEmail?.trim() ? `Email: ${dto.visitorEmail.trim()}` : null,
          queue ? `Queue ticket: #${queue.queueNumber} (${queue.peopleAhead} ahead)` : null,
          hostRow?.department ? `Your unit: ${hostRow.department}` : null,
        ].filter(Boolean) as string[];
        const detailBlock = detailParts.join("\n");
        const detailLines = [
          `${visitorName} has checked in at ${siteLabel}.`,
          ...detailParts,
          "Please come to reception to meet them.",
        ];

        const brandingForMail = await this.resolvePublicBranding(user.organisationId, dto.siteId);
        const html = buildHostNotificationHtml({
          visitorName,
          siteLabel,
          visitorTypeLabel: visitorTypeLabel ?? null,
          companyName: dto.companyName?.trim() || null,
          purposeLabel: purposeLabel ?? null,
          visitorPhone: dto.visitorPhone?.trim() || null,
          visitorEmail: dto.visitorEmail?.trim() || null,
          queueNumber: queue?.queueNumber ?? null,
          peopleAhead: queue?.peopleAhead ?? null,
          hostDepartment: hostRow?.department ?? null,
          brandColour: brandingForMail?.brandColourToken ?? null,
        });

        this.events.emit(
          VISIT_CHECKED_IN_EVENT,
          new VisitCheckedInEvent(
            dto.id,
            user.organisationId,
            hostContact,
            `${visitorName} is waiting at ${siteLabel} reception`,
            detailLines.join("\n"),
            html,
            visitorName,
            siteLabel,
            detailBlock,
          ),
        );
      }
      this.emitRosterChanged(inserted[0], "checked_in");
      return { ...inserted[0], queue };
    }

    // Idempotent retry: return the existing row rather than erroring, so an
    // offline-sync retry after a lost ack is a no-op, not a failure.
    const existing = await this.db.query.visitorVisits.findFirst({ where: eq(visitorVisits.id, dto.id) });
    if (!existing) {
      throw new NotFoundException("Visit conflict but row not found — unexpected state");
    }
    let queue: {
      queueEntryId: string;
      queueNumber: number;
      positionAtEnqueue: number;
      peopleAhead: number;
    } | null = null;
    try {
      queue = await this.waitQueue.enqueueForVisit({
        organisationId: user.organisationId,
        siteId: existing.siteId,
        visitId: existing.id,
        hostId: existing.hostId,
        actorId: user.userId,
      });
    } catch {
      queue = null;
    }
    return { ...existing, queue };
  }

  // Section 8.7's sign-out journey. Idempotent by the same principle: a
  // double check-out request (e.g. a flaky network retry) is a no-op, not
  // an error, and the status log only gains a new row on the transition
  // that actually happened.
  async checkOut(visitId: string, user: AuthenticatedUser) {
    const checkedOutStatus = await this.typeDefs.id("visit_status", "checked_out");
    const now = new Date();

    const updated = await this.db
      .update(visitorVisits)
      .set({ checkedOutAt: now, statusCode: checkedOutStatus })
      .where(
        and(
          eq(visitorVisits.id, visitId),
          eq(visitorVisits.organisationId, user.organisationId),
          isNull(visitorVisits.checkedOutAt),
          isNull(visitorVisits.deletedAt),
        ),
      )
      .returning();

    if (updated.length > 0) {
      await this.db.insert(visitStatusEvents).values({
        id: randomUUID(),
        visitId,
        toStatusCode: checkedOutStatus,
        occurredAt: now,
        actorId: user.userId,
      });
      await this.waitQueue.completeForVisit(visitId, user).catch(() => undefined);
      this.emitRosterChanged(updated[0], "checked_out");
      return updated[0];
    }

    const existing = await this.db.query.visitorVisits.findFirst({
      where: and(eq(visitorVisits.id, visitId), eq(visitorVisits.organisationId, user.organisationId)),
    });
    if (!existing) {
      throw new NotFoundException("Visit not found");
    }
    return existing; // already checked out — idempotent no-op
  }

  /**
   * Self-service / kiosk sign-out by phone at a site (FR-K03).
   * Does not expose a visitor directory — phone must match an open visit.
   */
  async signOutByPhone(siteId: string, visitorPhone: string, user: AuthenticatedUser) {
    const phoneHmacs = this.dataProtection.phoneLookupHmacCandidates(visitorPhone);
    const personalRows = await this.db.query.visitorPersonalData.findMany({
      where: inArray(visitorPersonalData.phoneLookupHmac, phoneHmacs),
    });
    if (personalRows.length === 0) {
      throw new NotFoundException("No open visit found for that phone at this site");
    }
    const visitorIds = personalRows.map((row) => row.visitorId);
    const openVisits = await this.db.query.visitorVisits.findMany({
      where: and(
        eq(visitorVisits.organisationId, user.organisationId),
        eq(visitorVisits.siteId, siteId),
        inArray(visitorVisits.visitorId, visitorIds),
        isNull(visitorVisits.checkedOutAt),
        isNull(visitorVisits.deletedAt),
      ),
      orderBy: [desc(visitorVisits.checkedInAt)],
    });
    const visit = openVisits[0];
    if (!visit) {
      throw new NotFoundException("No open visit found for that phone at this site");
    }
    const remainingOpen = openVisits.length - 1;
    const checkedOut = await this.checkOut(visit.id, user);
    return {
      visitId: checkedOut.id,
      siteId: checkedOut.siteId,
      checkedOutAt: checkedOut.checkedOutAt?.toISOString() ?? new Date().toISOString(),
      confirmationCode: visit.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
      remainingOpenVisits: remainingOpen,
      message:
        remainingOpen > 0
          ? `Signed out the most recent visit. ${remainingOpen} other open visit(s) remain for this phone — sign out again if needed.`
          : undefined,
    };
  }

  async publicCheckOut(dto: PublicCheckOutDto) {
    const validated = await this.siteQrReferences.validatePublicCheckInReference(dto.siteId, dto.referenceId);
    const systemUser: AuthenticatedUser = {
      userId: "00000000-0000-0000-0000-000000000001",
      organisationId: validated.organisationId,
      siteId: validated.siteId,
      roleCode: "system",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
      audience: "admin",
    };

    if (dto.visitId) {
      const visit = await this.db.query.visitorVisits.findFirst({
        where: and(
          eq(visitorVisits.id, dto.visitId),
          eq(visitorVisits.organisationId, validated.organisationId),
          eq(visitorVisits.siteId, validated.siteId),
          isNull(visitorVisits.deletedAt),
        ),
      });
      if (!visit) throw new NotFoundException("Visit not found at this site");
      if (visit.visitorId) {
        const personal = await this.db.query.visitorPersonalData.findFirst({
          where: eq(visitorPersonalData.visitorId, visit.visitorId),
        });
        const phoneHmacs = this.dataProtection.phoneLookupHmacCandidates(dto.visitorPhone);
        if (!personal || !personal.phoneLookupHmac || !phoneHmacs.includes(personal.phoneLookupHmac)) {
          throw new BadRequestException("Phone does not match this visit confirmation");
        }
      }
      const checkedOut = await this.checkOut(dto.visitId, systemUser);
      return {
        visitId: checkedOut.id,
        siteId: checkedOut.siteId,
        siteName: validated.siteName,
        checkedOutAt: checkedOut.checkedOutAt?.toISOString() ?? new Date().toISOString(),
        confirmationCode: dto.visitId.replace(/-/g, "").slice(0, 8).toUpperCase(),
        // Section 8.7: the optional satisfaction survey is offered on visitor
        // sign-out only (never emergency sign-out, which is a staff action).
        surveyToken: createSurveyToken(checkedOut.id, "qr"),
      };
    }

    const result = await this.signOutByPhone(validated.siteId, dto.visitorPhone, systemUser);
    return { ...result, siteName: validated.siteName, surveyToken: createSurveyToken(result.visitId, "qr") };
  }

  async approveAccess(visitId: string, _reason: string | undefined, user: AuthenticatedUser) {
    const pendingStatus = await this.typeDefs.id("visit_status", "pending_approval");
    const admittedStatus = await this.typeDefs.id("visit_status", "admitted");
    const visit = await this.db.query.visitorVisits.findFirst({
      where: and(
        eq(visitorVisits.id, visitId),
        eq(visitorVisits.organisationId, user.organisationId),
        isNull(visitorVisits.deletedAt),
      ),
    });
    if (!visit) throw new NotFoundException("Visit not found");
    if (visit.statusCode !== pendingStatus) {
      throw new BadRequestException("Only visits pending host approval can be approved");
    }

    const now = new Date();
    const [updated] = await this.db
      .update(visitorVisits)
      .set({ statusCode: admittedStatus })
      .where(eq(visitorVisits.id, visitId))
      .returning();

    await this.db.insert(visitStatusEvents).values({
      id: randomUUID(),
      visitId,
      fromStatusCode: pendingStatus,
      toStatusCode: admittedStatus,
      occurredAt: now,
      actorId: user.userId,
    });

    this.emitRosterChanged(updated, "approved");
    return updated;
  }

  async rejectAccess(visitId: string, _reason: string | undefined, user: AuthenticatedUser) {
    const pendingStatus = await this.typeDefs.id("visit_status", "pending_approval");
    const rejectedStatus = await this.typeDefs.id("visit_status", "entry_rejected");
    const visit = await this.db.query.visitorVisits.findFirst({
      where: and(
        eq(visitorVisits.id, visitId),
        eq(visitorVisits.organisationId, user.organisationId),
        isNull(visitorVisits.deletedAt),
      ),
    });
    if (!visit) throw new NotFoundException("Visit not found");
    if (visit.statusCode !== pendingStatus) {
      throw new BadRequestException("Only visits pending host approval can be rejected");
    }

    const now = new Date();
    const [updated] = await this.db
      .update(visitorVisits)
      .set({ statusCode: rejectedStatus, checkedOutAt: now })
      .where(eq(visitorVisits.id, visitId))
      .returning();

    await this.db.insert(visitStatusEvents).values({
      id: randomUUID(),
      visitId,
      fromStatusCode: pendingStatus,
      toStatusCode: rejectedStatus,
      occurredAt: now,
      actorId: user.userId,
    });

    this.emitRosterChanged(updated, "rejected");
    return updated;
  }

  private emitRosterChanged(
    visit: { organisationId: string; siteId: string; id: string },
    reason: VisitRosterChangeReason,
  ) {
    this.events.emit(
      VISIT_ROSTER_CHANGED_EVENT,
      new VisitRosterChangedEvent(visit.organisationId, visit.siteId, visit.id, reason),
    );
  }

  // Section 10.4's front-desk dashboard "ON SITE NOW" list.
  async listOpenBySite(siteId: string, user: AuthenticatedUser) {
    return this.db.query.visitorVisits.findMany({
      where: and(
        eq(visitorVisits.organisationId, user.organisationId),
        eq(visitorVisits.siteId, siteId),
        isNull(visitorVisits.checkedOutAt),
        isNull(visitorVisits.deletedAt),
      ),
      orderBy: [desc(visitorVisits.checkedInAt)],
    });
  }

  // Backs the admin app's front-desk/visitors/emergency roster tables —
  // resolves every *_code FK to its type_definition label and decrypts the
  // visitor/host display name, since the admin UI never receives raw
  // envelope ciphertext or opaque uuids (Part Three §4's default-table-
  // response rule).
  async listRoster(siteId: string, user: AuthenticatedUser, openOnly: boolean): Promise<VisitRosterRow[]> {
    const conditions = [eq(visitorVisits.organisationId, user.organisationId), isNull(visitorVisits.deletedAt)];
    if (siteId) conditions.push(eq(visitorVisits.siteId, siteId));
    if (openOnly) conditions.push(isNull(visitorVisits.checkedOutAt));

    const visits = await this.db.query.visitorVisits.findMany({
      where: and(...conditions),
      orderBy: [desc(visitorVisits.checkedInAt)],
      limit: 200,
    });
    return this.resolveRosterRows(visits);
  }

  /**
   * Date-range, cursor-paginated visit search — same keyset-pagination
   * shape as AuditService.listForOrganisation, for the same reason: a plain
   * OFFSET would skip/duplicate rows as new check-ins land between page
   * fetches. Separate from listRoster (kept unchanged for its existing
   * callers — kiosk roster, front-desk/emergency "currently open" views)
   * because a date-searchable history query is a genuinely different shape
   * of request, not a superset of "who's on site right now."
   */
  async searchRoster(
    user: AuthenticatedUser,
    input: { siteId?: string; from?: string; to?: string; limit?: number; cursor?: string },
  ): Promise<{ rows: VisitRosterRow[]; nextCursor: string | null }> {
    const limit = Math.min(input.limit ?? 50, 200);
    const conditions: SQL[] = [eq(visitorVisits.organisationId, user.organisationId), isNull(visitorVisits.deletedAt)];
    if (input.siteId) conditions.push(eq(visitorVisits.siteId, input.siteId));
    if (input.from) conditions.push(gte(visitorVisits.checkedInAt, new Date(input.from)));
    if (input.to) conditions.push(lte(visitorVisits.checkedInAt, new Date(input.to)));

    if (input.cursor) {
      const separatorIndex = input.cursor.lastIndexOf("_");
      const cursorCheckedInAt = new Date(input.cursor.slice(0, separatorIndex));
      const cursorId = input.cursor.slice(separatorIndex + 1);
      const cursorCondition = or(
        lt(visitorVisits.checkedInAt, cursorCheckedInAt),
        and(eq(visitorVisits.checkedInAt, cursorCheckedInAt), lt(visitorVisits.id, cursorId)),
      );
      if (cursorCondition) conditions.push(cursorCondition);
    }

    const visits = await this.db.query.visitorVisits.findMany({
      where: and(...conditions),
      orderBy: [desc(visitorVisits.checkedInAt), desc(visitorVisits.id)],
      limit: limit + 1,
    });

    const hasMore = visits.length > limit;
    const page = hasMore ? visits.slice(0, limit) : visits;
    const last = page.at(-1);
    const nextCursor = hasMore && last ? `${last.checkedInAt.toISOString()}_${last.id}` : null;

    return { rows: await this.resolveRosterRows(page), nextCursor };
  }

  /** Resolves *_code FKs to labels and decrypts visitor/host display names — shared by listRoster and searchRoster (Part Three §4's default-table-response rule: the admin UI never receives raw envelope ciphertext or opaque uuids). */
  private async resolveRosterRows(visits: (typeof visitorVisits.$inferSelect)[]): Promise<VisitRosterRow[]> {
    if (visits.length === 0) return [];

    const codeIds = Array.from(
      new Set(
        visits.flatMap((v) =>
          [v.visitorCategoryCode, v.statusCode, v.identityAssuranceLevelCode].filter((x): x is string => !!x),
        ),
      ),
    );
    const hostIds = Array.from(new Set(visits.map((v) => v.hostId)));
    const visitorIds = Array.from(new Set(visits.map((v) => v.visitorId).filter((x): x is string => !!x)));

    const [codeRows, hostRows, personalDataRows] = await Promise.all([
      codeIds.length ? this.db.query.typeDefinition.findMany({ where: inArray(typeDefinition.id, codeIds) }) : [],
      hostIds.length ? this.db.query.siteHosts.findMany({ where: inArray(siteHosts.id, hostIds) }) : [],
      visitorIds.length
        ? this.db.query.visitorPersonalData.findMany({ where: inArray(visitorPersonalData.visitorId, visitorIds) })
        : [],
    ]);
    const codeById = new Map(codeRows.map((c) => [c.id, c.code]));
    const hostById = new Map(hostRows.map((h) => [h.id, h]));
    const personalDataByVisitorId = new Map(personalDataRows.map((p) => [p.visitorId, p]));

    return visits.map((v) => {
      const host = hostById.get(v.hostId);
      const hostDisplayName =
        host?.hostNameProtected != null
          ? this.dataProtection.decrypt(host.hostNameProtected as ProtectedPersonalDataEnvelope)
          : null;

      const personalData = v.visitorId ? personalDataByVisitorId.get(v.visitorId) : undefined;
      let visitorDisplayName = "Visitor";
      if (personalData) {
        try {
          const decoded = JSON.parse(
            this.dataProtection.decrypt(personalData.encryptedPayload as ProtectedPersonalDataEnvelope),
          ) as {
            name?: string;
          };
          if (decoded.name) visitorDisplayName = decoded.name;
        } catch {
          // leave the "Visitor" fallback — malformed/legacy envelope
        }
      }

      const statusCode = v.statusCode ? (codeById.get(v.statusCode) ?? "unknown") : "unknown";

      return {
        visitId: v.id,
        siteId: v.siteId,
        visitorDisplayName,
        visitorTypeCode: v.visitorCategoryCode ? (codeById.get(v.visitorCategoryCode) ?? "unknown") : "unknown",
        hostDisplayName,
        assuranceLevelCode: v.identityAssuranceLevelCode ? (codeById.get(v.identityAssuranceLevelCode) ?? "V0") : "V0",
        visitStatusCode: statusCode,
        checkedInAt: v.checkedInAt.toISOString(),
        checkedOutAt: v.checkedOutAt?.toISOString() ?? null,
        offlineCaptured: v.offlineCaptured,
        requiresAction: isVisitStatusCode(statusCode) && statusCode === "pending_approval",
      };
    });
  }

  /** CSV export for the same date-range search, no pagination cap — "pull everyone who visited last Tuesday" as a file a front-desk lead can hand to an auditor. */
  async exportRoster(
    user: AuthenticatedUser,
    input: { siteId?: string; from?: string; to?: string },
  ): Promise<TabularExport> {
    const conditions: SQL[] = [eq(visitorVisits.organisationId, user.organisationId), isNull(visitorVisits.deletedAt)];
    if (input.siteId) conditions.push(eq(visitorVisits.siteId, input.siteId));
    if (input.from) conditions.push(gte(visitorVisits.checkedInAt, new Date(input.from)));
    if (input.to) conditions.push(lte(visitorVisits.checkedInAt, new Date(input.to)));

    const visits = await this.db.query.visitorVisits.findMany({
      where: and(...conditions),
      orderBy: [desc(visitorVisits.checkedInAt)],
    });
    const rows = await this.resolveRosterRows(visits);

    return {
      headers: ["visitor_name", "visitor_type", "host_name", "status", "checked_in_at", "checked_out_at"],
      rows: rows.map((r) => [
        r.visitorDisplayName,
        r.visitorTypeCode,
        r.hostDisplayName ?? null,
        r.visitStatusCode,
        String(r.checkedInAt),
        r.checkedOutAt ? String(r.checkedOutAt) : null,
      ]),
    };
  }

  async getById(visitId: string, user: AuthenticatedUser) {
    const found = await this.db.query.visitorVisits.findFirst({
      where: and(eq(visitorVisits.id, visitId), eq(visitorVisits.organisationId, user.organisationId)),
    });
    if (!found) throw new NotFoundException("Visit not found");
    return found;
  }
}
