package com.buffrcheckpoint.kiosk.core.domain.model

/**
 * Canonical visit_status / identity_assurance_level codes — keep aligned with
 * `buffrcheckpoint/shared/src` (TypeScript source of truth) and
 * `backend/db/seed/0001_type_definitions.sql`.
 *
 * Every enum below is reconciled against the backend's real seeded
 * type_definition rows, not aspirational doc-only values. Do not add values
 * here that are not seeded server-side — the wire code is a string sent
 * verbatim in request DTOs, and the backend resolves it via
 * TypeDefinitionLookupService.
 */

enum class VisitorType(val code: String) {
    GENERAL("general"),
    PRE_REGISTERED("pre_registered"),
    CONTRACTOR("contractor"),
    DELIVERY("delivery"),
    INTERVIEW("interview"),
    GOVERNMENT_VIP("government_vip"),
    HEALTHCARE("healthcare"),
    EVENT_ATTENDEE("event_attendee"),
    TEMPORARY_STAFF("temporary_staff"),
    RESTRICTED_SITE("restricted_site"),
}

enum class CaptureChannel(val code: String) {
    KIOSK("kiosk"),
    ASSISTED("assisted"),
    NFC_BADGE("nfc_badge"),
    NFC_PHONE("nfc_phone"),
    QR("qr"),
    SMS("sms"),
    DIGINAM("diginam"),
}

enum class PurposeCategory(val code: String) {
    BUSINESS("business"),
    PERSONAL("personal"),
    DELIVERY("delivery"),
    INTERVIEW("interview"),
    GOVERNMENT("government"),
    MEDICAL("medical"),
    MAINTENANCE("maintenance"),
    EVENT("event"),
}

/**
 * Seeded visit_status set (shared/src/visit-status.ts). PENDING_SYNC is also
 * used client-locally for rows that have not synced yet.
 */
enum class VisitStatus(val code: String) {
    PENDING_SYNC("pending_sync"),
    CHECKED_IN("checked_in"),
    CHECKED_OUT("checked_out"),
    SYNCED_ACK("synced_ack"),
    PENDING_APPROVAL("pending_approval"),
    ADMITTED("admitted"),
    ENTRY_REJECTED("entry_rejected"),
    ;

    companion object {
        /** Fails closed to null rather than crashing on an unknown/future server value. */
        fun fromCodeOrNull(code: String?): VisitStatus? = entries.firstOrNull { it.code == code }
    }
}

enum class IdentityAssuranceLevel(val code: String) {
    V0("V0"),
    V1("V1"),
    V2("V2"),
    V3("V3"),
    V4("V4"),
    ;

    companion object {
        fun fromCodeOrNull(code: String?): IdentityAssuranceLevel? = entries.firstOrNull { it.code == code }
    }
}

enum class CredentialType(val code: String) {
    NFC_BADGE("nfc_badge"),
    NFC_PHONE("nfc_phone"),
    PRINTED_BADGE("printed_badge"),
    DIGINAM_REFERENCE("diginam_reference"),
}

/** Mirrors GET /public/capability-status exactly — no auth required for that endpoint. */
data class CapabilityFlags(
    val diginamVerification: CapabilityLevel,
    val nationalEidNfc: CapabilityLevel,
    val nfcBadgeCheckIn: CapabilityLevel,
)

enum class CapabilityLevel(val code: String) {
    NOT_AVAILABLE("not_available"),
    TARGETED("targeted"),
    LIVE("live"),
    ;

    companion object {
        fun fromCodeOrDefault(code: String?): CapabilityLevel =
            entries.firstOrNull { it.code == code } ?: NOT_AVAILABLE
    }
}
