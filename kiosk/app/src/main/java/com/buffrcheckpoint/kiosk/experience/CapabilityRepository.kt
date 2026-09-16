package com.buffrcheckpoint.kiosk.experience

import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import javax.inject.Inject
import javax.inject.Singleton

data class KioskCapabilityFlags(
    val nfcBadgeLive: Boolean = false,
    val ussdLive: Boolean = false,
    val diginamLive: Boolean = false,
    val qrInvitationLive: Boolean = false,
    val smsConfirmationLive: Boolean = false,
    val nationalEidLive: Boolean = false,
)

@Singleton
class CapabilityRepository @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
) {
    private var cached: KioskCapabilityFlags = KioskCapabilityFlags()

    fun current(): KioskCapabilityFlags = cached

    suspend fun refresh(): KioskCapabilityFlags {
        cached = try {
            val status = runCatching { apiServiceProvider.get().effectiveCapabilityStatus() }
                .getOrElse { apiServiceProvider.get().capabilityStatus() }
            KioskCapabilityFlags(
                nfcBadgeLive = status.nfcBadgeCheckIn == "live",
                ussdLive = status.ussd == "live",
                diginamLive = status.diginamVerification == "live",
                qrInvitationLive = status.qrInvitationCheckIn == "live",
                smsConfirmationLive = status.smsContactConfirmation == "live",
                nationalEidLive = status.nationalEidNfc == "live",
            )
        } catch (_: Exception) {
            cached
        }
        return cached
    }
}
