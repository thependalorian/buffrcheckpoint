package com.buffrcheckpoint.kiosk.core.network.dto

import com.squareup.moshi.JsonClass

/**
 * Mirrors backend/src/modules/visits/dto/check-in.dto.ts field-for-field.
 * The backend's ValidationPipe uses forbidNonWhitelisted:true — any extra or
 * misspelled field here causes a hard 400, so this DTO must not drift from
 * the NestJS DTO without updating both sides together.
 *
 * visitorTypeCode / purposeCategoryCode / captureChannelCode are STRING
 * CODES (e.g. "kiosk", "general"), not UUIDs — the backend resolves them via
 * TypeDefinitionLookupService.
 */
@JsonClass(generateAdapter = true)
data class VisitFormAnswerDto(
    val formVersionId: String,
    val fieldCode: String,
    val answerValue: Map<String, Any?>? = null,
    val fieldLabelSnapshot: String? = null,
)

@JsonClass(generateAdapter = true)
data class CheckInRequest(
    val id: String,
    val siteId: String,
    val zoneId: String? = null,
    val visitorId: String? = null,
    val visitorName: String? = null,
    val visitorPhone: String? = null,
    val companyName: String? = null,
    val visitorEmail: String? = null,
    val vehicleRegistration: String? = null,
    val idDocumentNumber: String? = null,
    val hostId: String,
    val visitorTypeCode: String,
    val invitationId: String? = null,
    val purposeCategoryCode: String? = null,
    val captureChannelCode: String,
    val checkedInAt: String,
    val offlineCaptured: Boolean? = null,
    val formAnswers: List<VisitFormAnswerDto>? = null,
)

@JsonClass(generateAdapter = true)
data class EffectiveFormFieldDto(
    val fieldCode: String,
    val fieldLabel: String,
    val helpText: String? = null,
    val fieldTypeCode: String = "text",
    val required: Boolean = false,
    val displayOrder: Int = 0,
    val dataClassificationCode: String = "basic",
    val visibilityRule: Map<String, Any?> = emptyMap(),
    val validationSchema: Map<String, Any?> = emptyMap(),
)

@JsonClass(generateAdapter = true)
data class EffectiveCheckInFormDto(
    val formDefinitionId: String,
    val formVersionId: String,
    val formName: String?,
    val visitorTypeCode: String,
    val fields: List<EffectiveFormFieldDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class SignOutByPhoneRequest(
    val siteId: String,
    val visitorPhone: String,
)

@JsonClass(generateAdapter = true)
data class SignOutByPhoneResponse(
    val visitId: String,
    val siteId: String,
    val checkedOutAt: String?,
    val confirmationCode: String?,
    /** Proves this visit for the optional post-visit rating (Section 8.7). */
    val surveyToken: String? = null,
)

/** One of the five satisfaction ratings; score is 1 (very poor) to 5 (very good). */
@JsonClass(generateAdapter = true)
data class SurveyOptionDto(
    val code: String,
    val label: String,
    val score: Int,
)

@JsonClass(generateAdapter = true)
data class SurveySubmitRequest(
    val token: String,
    val ratingCode: String,
    /** Optional free text, at most 1000 characters. The server stores it encrypted. Null when the visitor typed nothing. */
    val comment: String? = null,
)

@JsonClass(generateAdapter = true)
data class SurveySubmitResponse(
    val recorded: Boolean,
    val duplicate: Boolean,
)

// Mirrors the raw visitorVisits row returned by POST /visits/check-in and
// POST /visits/:id/check-out. Most *Code fields are UUID foreign keys on
// this raw shape (not string codes) — do not try to enum-match them
// directly; use VisitRosterRow (display-ready) for status/UI purposes.
@JsonClass(generateAdapter = true)
data class VisitResponse(
    val id: String,
    val organisationId: String,
    val siteId: String,
    val zoneId: String?,
    val visitorId: String?,
    val hostId: String,
    val checkedInAt: String?,
    val serverAcceptedAt: String?,
    val checkedOutAt: String?,
    val offlineCaptured: Boolean?,
)

// Mirrors VisitRosterRow returned by GET /visits/roster — display-ready,
// resolved string codes. requiresAction is currently always false
// server-side (dead pending_approval check) — surface passively, don't gate
// a workflow on it.
@JsonClass(generateAdapter = true)
data class VisitRosterRowDto(
    val visitId: String,
    val siteId: String,
    val visitorDisplayName: String,
    val visitorTypeCode: String,
    val hostDisplayName: String,
    val assuranceLevelCode: String?,
    val visitStatusCode: String,
    val checkedInAt: String?,
    val checkedOutAt: String?,
    val offlineCaptured: Boolean,
    val requiresAction: Boolean,
)
