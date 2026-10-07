package com.buffrcheckpoint.kiosk.core.network.dto

import com.squareup.moshi.JsonClass

// Mirrors GET /public/capability-status — public, unauthenticated endpoint.
// Each value is "not_available" | "targeted" | "live".
@JsonClass(generateAdapter = true)
data class CapabilityStatusResponse(
    val diginamVerification: String,
    val nationalEidNfc: String,
    val nfcBadgeCheckIn: String,
    val qrInvitationCheckIn: String = "not_available",
    val smsContactConfirmation: String = "not_available",
)

// Mirrors GET /type-definitions?domain=<domain>.
@JsonClass(generateAdapter = true)
data class TypeDefinitionRow(
    val id: String,
    val domain: String,
    val code: String,
    val label: String?,
    val sortOrder: Int?,
)
