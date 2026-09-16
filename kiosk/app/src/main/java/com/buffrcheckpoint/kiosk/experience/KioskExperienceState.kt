package com.buffrcheckpoint.kiosk.experience

/**
 * Cached site experience pulled from admin configuration — drives welcome
 * branding, channel tiles, idle timeout, and maintenance mode on the kiosk.
 */
data class KioskExperienceState(
    val welcomeMessage: String = "Welcome",
    val organisationDisplayName: String? = null,
    val siteDisplayName: String? = null,
    val helpContactReference: String? = null,
    val brandColourToken: String? = null,
    val logoUrl: String? = null,
    val privacyNoticeVersionId: String? = null,
    val privacyPolicyName: String? = null,
    val privacyPolicyText: String? = null,
    val idleTimeoutSeconds: Int = 120,
    val idleWarningSeconds: Int = 30,
    val maintenanceModeEnabled: Boolean = false,
    val maintenanceMessage: String? = null,
    val assistedEntryDirection: String? = null,
    val accessibilityLargeTextEnabled: Boolean = false,
    val enabledChannelCodes: Set<String> = emptySet(),
    val languageCodes: List<String> = listOf("en"),
    val selectedLanguageCode: String = "en",
    val brandingProfileVersionId: String? = null,
    val kioskExperienceConfigurationVersionId: String? = null,
    val publicCheckInQrPayload: String? = null,
    val publicCheckInQrLabel: String? = null,
    val publicCheckInQrActive: Boolean = false,
)
