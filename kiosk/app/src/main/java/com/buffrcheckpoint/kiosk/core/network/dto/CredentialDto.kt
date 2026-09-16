package com.buffrcheckpoint.kiosk.core.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class HostRowDto(
    val id: String,
    val siteId: String,
    val displayName: String,
    val department: String?,
    val active: Boolean,
    val hasContact: Boolean,
)

// Mirrors backend/src/modules/credentials/dto/validate-credential.dto.ts
// (kiosk plan "Addition A"). The kiosk never derives this from a tag's raw
// UID — it reads the server-issued opaque reference written onto the tag at
// provisioning time.
@JsonClass(generateAdapter = true)
data class OpenReaderSessionRequest(
    val deviceId: String,
)

@JsonClass(generateAdapter = true)
data class OpenReaderSessionResponse(
    val readerSessionReference: String,
    val expiresAt: String,
)

@JsonClass(generateAdapter = true)
data class ValidateCredentialRequest(
    val readerSessionReference: String,
    val credentialReference: String,
    val requestedZoneReference: String? = null,
    val challengeResponse: String? = null,
)

// Mirrors CredentialsService#validate's discriminated response. Moshi can't
// deserialize a Kotlin sealed/union type generically from this shape, so the
// repository layer inspects `valid` and `reason` itself.
@JsonClass(generateAdapter = true)
data class ValidateCredentialResponse(
    val valid: Boolean,
    val credentialId: String? = null,
    val holderTypeCode: String? = null,
    val holderId: String? = null,
    val credentialTypeCode: String? = null,
    val reason: String? = null,
)

@JsonClass(generateAdapter = true)
data class InvitationResolveResponse(
    val invitationId: String,
    val siteId: String,
    val siteName: String,
    val hostId: String,
    val visitorCategoryCode: String,
)

// Mirrors GET /devices response rows — read-only in this app (Phase 6, admin-facing).
@JsonClass(generateAdapter = true)
data class DeviceResponse(
    val id: String,
    val siteId: String,
    val manufacturer: String,
    val model: String,
    val serialNumber: String,
    val cranComplianceStatusCode: String,
    val firmwareVersion: String?,
)

@JsonClass(generateAdapter = true)
data class DeviceStatusHistoryRow(
    val id: String,
    val statusCode: String,
    val occurredAt: String,
    val actorId: String?,
    val reason: String?,
)
