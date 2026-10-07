package com.buffrcheckpoint.kiosk.navigation

object KioskDestinations {
    const val KIOSK_SETUP = "kiosk_setup"
    const val LOGIN = "login"
    const val MAINTENANCE = "maintenance"
    const val WELCOME = "welcome"
    const val HOME = "roster"
    const val PRIVACY_NOTICE = "privacy_notice?nextRoute={nextRoute}"
    fun privacyNotice(nextRoute: String = "manual_check_in"): String = "privacy_notice?nextRoute=$nextRoute"
    const val MANUAL_CHECK_IN_BASE = "manual_check_in"
    const val MANUAL_CHECK_IN = "manual_check_in?invitationId={invitationId}&hostId={hostId}"
    fun manualCheckIn(invitationId: String? = null, hostId: String? = null): String {
        val params = buildList {
            if (invitationId != null) add("invitationId=$invitationId")
            if (hostId != null) add("hostId=$hostId")
        }
        return if (params.isEmpty()) MANUAL_CHECK_IN_BASE else "$MANUAL_CHECK_IN_BASE?${params.joinToString("&")}"
    }
    const val ASSISTED_CHECK_IN = "assisted_check_in"
    const val QR_CHECK_IN = "qr_check_in"
    const val NFC_CHECK_IN = "nfc_check_in"
    const val CHECK_IN_SUCCESS =
        "check_in_success/{visitId}?visitorName={visitorName}&hostName={hostName}&hostDepartment={hostDepartment}&visitorTypeCode={visitorTypeCode}"
    fun checkInSuccess(
        visitId: String,
        visitorName: String = "",
        hostName: String = "",
        hostDepartment: String = "",
        visitorTypeCode: String = "general",
    ) =
        "check_in_success/$visitId" +
            "?visitorName=${android.net.Uri.encode(visitorName)}" +
            "&hostName=${android.net.Uri.encode(hostName)}" +
            "&hostDepartment=${android.net.Uri.encode(hostDepartment)}" +
            "&visitorTypeCode=${android.net.Uri.encode(visitorTypeCode)}"
    const val DEVICE_LIST = "device_list"
    const val ABOUT_DEBUG = "about_debug"
    const val VISITOR_SIGN_OUT = "visitor_sign_out"
}
