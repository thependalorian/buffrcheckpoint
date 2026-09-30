package com.buffrcheckpoint.kiosk.core.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Stores the kiosk's base URL, its service-account email/password, and the
 * current JWT — all Keystore-backed via EncryptedSharedPreferences.
 *
 * The backend has no refresh-token endpoint (auth.module.ts issues only a
 * signed 8h JWT), so [AuthAuthenticator] must be able to re-login on 401,
 * which means the password has to be stored, not just the token. This is a
 * pragmatic MVP tradeoff, not the doc's aspirational per-device credential
 * model — there is no device-identity auth on the backend to build against.
 */
@Singleton
class CredentialStore @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "buffr_checkpoint_kiosk_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var baseUrl: String?
        get() = prefs.getString(KEY_BASE_URL, null)
        set(value) = prefs.edit().putString(KEY_BASE_URL, value).apply()

    var siteId: String?
        get() = prefs.getString(KEY_SITE_ID, null)
        set(value) = prefs.edit().putString(KEY_SITE_ID, value).apply()

    var serviceAccountEmail: String?
        get() = prefs.getString(KEY_EMAIL, null)
        set(value) = prefs.edit().putString(KEY_EMAIL, value).apply()

    var serviceAccountPassword: String?
        get() = prefs.getString(KEY_PASSWORD, null)
        set(value) = prefs.edit().putString(KEY_PASSWORD, value).apply()

    var accessToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    fun hasSiteConfiguration(): Boolean =
        !baseUrl.isNullOrBlank() && !siteId.isNullOrBlank()

    fun isProvisioned(): Boolean =
        hasSiteConfiguration() &&
            !serviceAccountEmail.isNullOrBlank() && !serviceAccountPassword.isNullOrBlank()

    fun clearToken() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    fun wipe() {
        prefs.edit().clear().apply()
    }

    fun clearExperienceCache() {
        prefs.edit()
            .remove(KEY_WELCOME)
            .remove(KEY_ORG_NAME)
            .remove(KEY_SITE_NAME)
            .remove(KEY_HELP)
            .remove(KEY_BRAND_COLOUR)
            .remove(KEY_PRIVACY_VERSION)
            .remove(KEY_PRIVACY_NAME)
            .remove(KEY_IDLE_TIMEOUT)
            .remove(KEY_IDLE_WARNING)
            .remove(KEY_MAINTENANCE)
            .remove(KEY_MAINTENANCE_MSG)
            .remove(KEY_ASSISTED_DIR)
            .remove(KEY_CHANNELS)
            .remove(KEY_LOGO_URL)
            .remove(KEY_PRIVACY_TEXT)
            .remove(KEY_LANGUAGES)
            .remove(KEY_SELECTED_LANGUAGE)
            .remove(KEY_LARGE_TEXT)
            .remove(KEY_QR_PAYLOAD)
            .remove(KEY_QR_LABEL)
            .remove(KEY_QR_ACTIVE)
            .apply()
    }

    fun cacheExperience(state: KioskExperienceState) {
        prefs.edit()
            .putString(KEY_WELCOME, state.welcomeMessage)
            .putString(KEY_ORG_NAME, state.organisationDisplayName)
            .putString(KEY_SITE_NAME, state.siteDisplayName)
            .putString(KEY_HELP, state.helpContactReference)
            .putString(KEY_BRAND_COLOUR, state.brandColourToken)
            .putString(KEY_PRIVACY_VERSION, state.privacyNoticeVersionId)
            .putString(KEY_PRIVACY_NAME, state.privacyPolicyName)
            .putInt(KEY_IDLE_TIMEOUT, state.idleTimeoutSeconds)
            .putInt(KEY_IDLE_WARNING, state.idleWarningSeconds)
            .putBoolean(KEY_MAINTENANCE, state.maintenanceModeEnabled)
            .putString(KEY_MAINTENANCE_MSG, state.maintenanceMessage)
            .putString(KEY_ASSISTED_DIR, state.assistedEntryDirection)
            .putString(KEY_CHANNELS, state.enabledChannelCodes.joinToString(","))
            .putString(KEY_LOGO_URL, state.logoUrl)
            .putString(KEY_PRIVACY_TEXT, state.privacyPolicyText)
            .putString(KEY_LANGUAGES, state.languageCodes.joinToString(","))
            .putString(KEY_SELECTED_LANGUAGE, state.selectedLanguageCode)
            .putBoolean(KEY_LARGE_TEXT, state.accessibilityLargeTextEnabled)
            .putString(KEY_QR_PAYLOAD, migrateCheckInQrPayload(state.publicCheckInQrPayload))
            .putString(KEY_QR_LABEL, state.publicCheckInQrLabel)
            .putBoolean(KEY_QR_ACTIVE, state.publicCheckInQrActive)
            .apply()
    }

    fun loadCachedExperience(): KioskExperienceState? {
        if (!prefs.contains(KEY_WELCOME)) return null
        val channels = prefs.getString(KEY_CHANNELS, "")?.split(",")?.filter { it.isNotBlank() }?.toSet() ?: emptySet()
        val languages = prefs.getString(KEY_LANGUAGES, "en")?.split(",")?.filter { it.isNotBlank() } ?: listOf("en")
        return KioskExperienceState(
            welcomeMessage = prefs.getString(KEY_WELCOME, "Welcome") ?: "Welcome",
            organisationDisplayName = prefs.getString(KEY_ORG_NAME, null),
            siteDisplayName = prefs.getString(KEY_SITE_NAME, null),
            helpContactReference = prefs.getString(KEY_HELP, null),
            brandColourToken = prefs.getString(KEY_BRAND_COLOUR, null),
            logoUrl = prefs.getString(KEY_LOGO_URL, null),
            privacyNoticeVersionId = prefs.getString(KEY_PRIVACY_VERSION, null),
            privacyPolicyName = prefs.getString(KEY_PRIVACY_NAME, null),
            privacyPolicyText = prefs.getString(KEY_PRIVACY_TEXT, null),
            idleTimeoutSeconds = prefs.getInt(KEY_IDLE_TIMEOUT, 120),
            idleWarningSeconds = prefs.getInt(KEY_IDLE_WARNING, 30),
            maintenanceModeEnabled = prefs.getBoolean(KEY_MAINTENANCE, false),
            maintenanceMessage = prefs.getString(KEY_MAINTENANCE_MSG, null),
            assistedEntryDirection = prefs.getString(KEY_ASSISTED_DIR, null),
            accessibilityLargeTextEnabled = prefs.getBoolean(KEY_LARGE_TEXT, false),
            enabledChannelCodes = channels,
            languageCodes = languages,
            selectedLanguageCode = prefs.getString(KEY_SELECTED_LANGUAGE, "en") ?: "en",
            publicCheckInQrPayload = migrateCheckInQrPayload(prefs.getString(KEY_QR_PAYLOAD, null)),
            publicCheckInQrLabel = prefs.getString(KEY_QR_LABEL, null),
            publicCheckInQrActive = prefs.getBoolean(KEY_QR_ACTIVE, false),
        )
    }

    /** Rewrite legacy v0.10 host so stale emulator caches open the live site. */
    private fun migrateCheckInQrPayload(payload: String?): String? {
        if (payload.isNullOrBlank()) return payload
        return payload.replace("https://buffrconnect.com", "https://buffrcheckpoint.com")
            .replace("http://buffrconnect.com", "https://buffrcheckpoint.com")
    }

    private companion object {
        const val KEY_BASE_URL = "base_url"
        const val KEY_SITE_ID = "site_id"
        const val KEY_EMAIL = "service_account_email"
        const val KEY_PASSWORD = "service_account_password"
        const val KEY_TOKEN = "access_token"
        const val KEY_WELCOME = "experience_welcome"
        const val KEY_ORG_NAME = "experience_org_name"
        const val KEY_SITE_NAME = "experience_site_name"
        const val KEY_HELP = "experience_help"
        const val KEY_BRAND_COLOUR = "experience_brand_colour"
        const val KEY_PRIVACY_VERSION = "experience_privacy_version"
        const val KEY_PRIVACY_NAME = "experience_privacy_name"
        const val KEY_IDLE_TIMEOUT = "experience_idle_timeout"
        const val KEY_IDLE_WARNING = "experience_idle_warning"
        const val KEY_MAINTENANCE = "experience_maintenance"
        const val KEY_MAINTENANCE_MSG = "experience_maintenance_msg"
        const val KEY_ASSISTED_DIR = "experience_assisted_dir"
        const val KEY_CHANNELS = "experience_channels"
        const val KEY_LOGO_URL = "experience_logo_url"
        const val KEY_PRIVACY_TEXT = "experience_privacy_text"
        const val KEY_LANGUAGES = "experience_languages"
        const val KEY_SELECTED_LANGUAGE = "experience_selected_language"
        const val KEY_LARGE_TEXT = "experience_large_text"
        const val KEY_QR_PAYLOAD = "experience_qr_payload"
        const val KEY_QR_LABEL = "experience_qr_label"
        const val KEY_QR_ACTIVE = "experience_qr_active"
    }
}
