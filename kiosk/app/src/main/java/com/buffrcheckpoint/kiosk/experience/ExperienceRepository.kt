package com.buffrcheckpoint.kiosk.experience

import android.content.Context
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.AcknowledgePolicyRequest
import com.buffrcheckpoint.kiosk.core.network.dto.PreCheckinAcknowledgePolicyRequest
import com.buffrcheckpoint.kiosk.core.network.dto.EffectiveKioskExperienceResponse
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import com.buffrcheckpoint.kiosk.sync.OutboxDrainWorker
import com.buffrcheckpoint.kiosk.sync.OutboxRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExperienceRepository @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    private val credentialStore: CredentialStore,
    private val outboxRepository: OutboxRepository,
    @ApplicationContext private val appContext: Context,
) {
    private var cachedState: KioskExperienceState = KioskExperienceState()
    var pendingPolicyVersionId: String? = null
    var policyDisplayedAtIso: String? = null
    var kioskSessionId: String? = null

    fun currentState(): KioskExperienceState = cachedState

    suspend fun syncFromBackend(): KioskExperienceState {
        val siteId = credentialStore.siteId ?: return cachedState
        val effective = try {
            apiServiceProvider.get().effectiveKioskExperience(siteId)
        } catch (_: Exception) {
            null
        }

        cachedState = mapEffective(effective)
        credentialStore.cacheExperience(cachedState)
        return cachedState
    }

    fun loadCached(): KioskExperienceState {
        cachedState = credentialStore.loadCachedExperience() ?: cachedState
        return cachedState
    }

    fun setSelectedLanguage(code: String) {
        cachedState = cachedState.copy(selectedLanguageCode = code)
        credentialStore.cacheExperience(cachedState)
    }

    fun markPrivacyDisplayed(policyVersionId: String) {
        pendingPolicyVersionId = policyVersionId
        policyDisplayedAtIso = Instant.now().toString()
        kioskSessionId = kioskSessionId ?: UUID.randomUUID().toString()
    }

    suspend fun acknowledgePreCheckinPolicy(captureChannelCode: String = "kiosk") {
        val siteId = credentialStore.siteId ?: return
        val policyVersionId = pendingPolicyVersionId ?: cachedState.privacyNoticeVersionId ?: return
        val sessionId = kioskSessionId ?: return
        val displayedAt = policyDisplayedAtIso ?: Instant.now().toString()
        val request = PreCheckinAcknowledgePolicyRequest(
            siteId = siteId,
            kioskSessionId = sessionId,
            policyVersionId = policyVersionId,
            legalBasisCode = "mandatory_notice",
            languageShownCode = cachedState.selectedLanguageCode,
            acknowledgementMethodCode = "kiosk_tap",
            displayedAt = displayedAt,
            acceptedAt = Instant.now().toString(),
            captureChannelCode = captureChannelCode,
        )
        try {
            apiServiceProvider.get().acknowledgePolicyPreCheckin(request)
        } catch (_: java.io.IOException) {
            outboxRepository.enqueuePrivacyPreAck(request)
            OutboxDrainWorker.enqueue(appContext)
        } catch (_: Exception) {
            // Policy version not configured — local gate still applies.
        }
    }

    suspend fun acknowledgePendingPolicy(visitId: String) {
        val policyVersionId = pendingPolicyVersionId ?: cachedState.privacyNoticeVersionId ?: return
        val displayedAt = policyDisplayedAtIso ?: Instant.now().toString()
        try {
            apiServiceProvider.get().acknowledgePolicy(
                AcknowledgePolicyRequest(
                    visitId = visitId,
                    policyVersionId = policyVersionId,
                    legalBasisCode = "mandatory_notice",
                    languageShownCode = cachedState.selectedLanguageCode,
                    acknowledgementMethodCode = "kiosk_tap",
                    displayedAt = displayedAt,
                    acceptedAt = Instant.now().toString(),
                ),
            )
        } catch (_: Exception) {
            // Best-effort — visit row carries snapshot FKs regardless.
        } finally {
            pendingPolicyVersionId = null
            policyDisplayedAtIso = null
        }
    }

    fun clearVisitorSession() {
        pendingPolicyVersionId = null
        policyDisplayedAtIso = null
        kioskSessionId = null
    }

    private fun mapEffective(effective: EffectiveKioskExperienceResponse?): KioskExperienceState {
        if (effective == null) return loadCached()

        val branding = effective.branding?.version
        val channelCodes = buildSet {
            effective.channels.mapTo(this) { it.captureChannelCode }
            effective.branding?.channels?.forEach { add(it.captureChannelCode) }
        }
        val previous = loadCached()

        return KioskExperienceState(
            welcomeMessage = branding?.welcomeMessage ?: "Welcome",
            organisationDisplayName = branding?.organisationDisplayName,
            siteDisplayName = branding?.siteDisplayName,
            helpContactReference = branding?.helpContactReference,
            brandColourToken = branding?.brandColourToken,
            logoUrl = effective.logoUrl,
            privacyNoticeVersionId = effective.privacyNoticeContent?.versionId ?: branding?.privacyNoticeVersionId,
            privacyPolicyName = effective.privacyNoticeContent?.policyName,
            privacyPolicyText = effective.privacyNoticeContent?.contentText,
            idleTimeoutSeconds = effective.version.idleTimeoutSeconds,
            idleWarningSeconds = effective.version.idleWarningSeconds,
            maintenanceModeEnabled = effective.version.maintenanceModeEnabled,
            maintenanceMessage = effective.version.maintenanceMessage,
            assistedEntryDirection = effective.version.assistedEntryDirection,
            accessibilityLargeTextEnabled = effective.version.accessibilityLargeTextEnabled,
            enabledChannelCodes = channelCodes,
            languageCodes = effective.languageCodes.ifEmpty { listOf("en") },
            selectedLanguageCode = previous.selectedLanguageCode,
            brandingProfileVersionId = branding?.id,
            kioskExperienceConfigurationVersionId = effective.version.id,
            publicCheckInQrPayload = effective.publicCheckInQr?.payload
                ?.replace("https://buffrconnect.com", "https://buffrcheckpoint.com")
                ?.replace("http://buffrconnect.com", "https://buffrcheckpoint.com"),
            publicCheckInQrLabel = effective.publicCheckInQr?.label,
            publicCheckInQrActive = effective.publicCheckInQr?.active ?: false,
        )
    }
}
