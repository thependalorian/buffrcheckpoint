package com.buffrcheckpoint.kiosk.checkin

import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.Visit
import com.buffrcheckpoint.kiosk.core.network.dto.CheckInRequest
import com.buffrcheckpoint.kiosk.core.network.dto.VisitFormAnswerDto
import com.buffrcheckpoint.kiosk.core.network.dto.VisitResponse
import java.time.Instant

/**
 * Pure mapping, kept separate from CheckInRepository so it's independently
 * unit-testable (see CheckInDraftToRequestMapperTest in the verification
 * plan): confirms string codes are sent, not UUIDs, and that the client
 * idempotency id passes through unchanged.
 */
fun CheckInDraft.toRequest(): CheckInRequest = CheckInRequest(
    id = id,
    siteId = siteId,
    zoneId = zoneId,
    visitorId = visitorId,
    visitorName = visitorName,
    visitorPhone = visitorPhone,
    companyName = companyName,
    visitorEmail = visitorEmail,
    vehicleRegistration = vehicleRegistration,
    idDocumentNumber = idDocumentNumber,
    hostId = hostId,
    visitorTypeCode = visitorType.code,
    invitationId = invitationId,
    purposeCategoryCode = purposeCategory?.code,
    captureChannelCode = captureChannel.code,
    checkedInAt = capturedAt.toString(),
    offlineCaptured = offlineCaptured,
    formAnswers = formAnswers.takeIf { it.isNotEmpty() }?.map { answer ->
        VisitFormAnswerDto(
            formVersionId = answer.formVersionId,
            fieldCode = answer.fieldCode,
            answerValue = mapOf("value" to answer.value),
            fieldLabelSnapshot = answer.fieldLabelSnapshot,
        )
    },
)

fun VisitResponse.toDomain(): Visit = Visit(
    id = id,
    organisationId = organisationId,
    siteId = siteId,
    zoneId = zoneId,
    visitorId = visitorId,
    hostId = hostId,
    checkedInAt = checkedInAt?.let { Instant.parse(it) },
    serverAcceptedAt = serverAcceptedAt?.let { Instant.parse(it) },
    checkedOutAt = checkedOutAt?.let { Instant.parse(it) },
    offlineCaptured = offlineCaptured ?: false,
)
