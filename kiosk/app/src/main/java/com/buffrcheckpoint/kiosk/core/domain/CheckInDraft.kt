package com.buffrcheckpoint.kiosk.core.domain

import com.buffrcheckpoint.kiosk.core.domain.model.CaptureChannel
import com.buffrcheckpoint.kiosk.core.domain.model.PurposeCategory
import com.buffrcheckpoint.kiosk.core.domain.model.VisitorType
import java.time.Instant
import java.util.UUID

/**
 * What a check-in screen builds before submission. [id] is the idempotency
 * key sent as CheckInRequest.id — it MUST be generated exactly once, at
 * draft-creation time, and reused verbatim across every retry. The backend
 * (visits.service.ts) dedupes on this field with onConflictDoNothing;
 * regenerating it on retry would defeat that and risk duplicate visits.
 */
data class CheckInDraft(
    val id: String = UUID.randomUUID().toString(),
    val siteId: String,
    val zoneId: String? = null,
    val visitorId: String? = null,
    val visitorName: String? = null,
    val visitorPhone: String? = null,
    /** First-class PII — mirrors CheckInDto / public check-in; written into visitor_personal_data. */
    val companyName: String? = null,
    val visitorEmail: String? = null,
    val vehicleRegistration: String? = null,
    val idDocumentNumber: String? = null,
    val hostId: String,
    val visitorType: VisitorType,
    val invitationId: String? = null,
    val purposeCategory: PurposeCategory? = null,
    val captureChannel: CaptureChannel,
    val capturedAt: Instant = Instant.now(),
    val offlineCaptured: Boolean = false,
    val formAnswers: List<FormAnswerDraft> = emptyList(),
)

data class FormAnswerDraft(
    val formVersionId: String,
    val fieldCode: String,
    val fieldLabelSnapshot: String? = null,
    val value: String = "",
)

data class Visit(
    val id: String,
    val organisationId: String,
    val siteId: String,
    val zoneId: String?,
    val visitorId: String?,
    val hostId: String,
    val checkedInAt: Instant?,
    val serverAcceptedAt: Instant?,
    val checkedOutAt: Instant?,
    val offlineCaptured: Boolean,
)

/** Mirrors VisitRosterRow from GET /visits/roster — display-ready, string codes already resolved server-side. */
data class RosterEntry(
    val visitId: String,
    val siteId: String,
    val visitorDisplayName: String,
    val visitorTypeCode: String,
    val hostDisplayName: String,
    val assuranceLevelCode: String?,
    val visitStatusCode: String,
    val checkedInAt: Instant?,
    val checkedOutAt: Instant?,
    val offlineCaptured: Boolean,
    val requiresAction: Boolean,
)
