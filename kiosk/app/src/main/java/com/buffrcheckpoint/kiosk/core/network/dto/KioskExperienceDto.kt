package com.buffrcheckpoint.kiosk.core.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class EffectiveKioskExperienceResponse(
    val config: KioskExperienceConfigDto,
    val version: KioskExperienceVersionDto,
    val channels: List<KioskExperienceChannelDto>,
    val branding: PublishedBrandingBundleDto?,
    val logoUrl: String? = null,
    val privacyNoticeContent: PrivacyNoticeContentDto? = null,
    val languageCodes: List<String> = emptyList(),
    val publicCheckInQr: PublicCheckInQrDto? = null,
)

@JsonClass(generateAdapter = true)
data class PublicCheckInQrDto(
    val referenceId: String,
    val label: String,
    val payload: String,
    val active: Boolean,
)

@JsonClass(generateAdapter = true)
data class PrivacyNoticeContentDto(
    val versionId: String,
    val policyName: String?,
    val contentText: String,
    val contentUrl: String?,
)

@JsonClass(generateAdapter = true)
data class KioskExperienceConfigDto(
    val id: String,
    val siteId: String,
    val deviceId: String?,
    val configName: String?,
)

@JsonClass(generateAdapter = true)
data class KioskExperienceVersionDto(
    val id: String,
    val brandingProfileVersionId: String?,
    val versionNumber: Int,
    val idleTimeoutSeconds: Int,
    val idleWarningSeconds: Int,
    val maintenanceModeEnabled: Boolean,
    val maintenanceMessage: String?,
    val assistedEntryDirection: String?,
    val accessibilityLargeTextEnabled: Boolean,
)

@JsonClass(generateAdapter = true)
data class KioskExperienceChannelDto(
    val id: String,
    val captureChannelCode: String,
)

@JsonClass(generateAdapter = true)
data class PublishedBrandingBundleDto(
    val profile: SiteBrandingProfileDto,
    val version: SiteBrandingVersionDto,
    val languages: List<SiteBrandingLanguageDto>,
    val channels: List<SiteBrandingChannelDto>,
)

@JsonClass(generateAdapter = true)
data class SiteBrandingProfileDto(
    val id: String,
    val siteId: String?,
    val profileName: String?,
)

@JsonClass(generateAdapter = true)
data class SiteBrandingVersionDto(
    val id: String,
    val welcomeMessage: String?,
    val brandColourToken: String?,
    val organisationDisplayName: String?,
    val siteDisplayName: String?,
    val helpContactReference: String?,
    val privacyNoticeVersionId: String?,
)

@JsonClass(generateAdapter = true)
data class SiteBrandingLanguageDto(
    val languageCode: String,
)

@JsonClass(generateAdapter = true)
data class SiteBrandingChannelDto(
    val captureChannelCode: String,
)
