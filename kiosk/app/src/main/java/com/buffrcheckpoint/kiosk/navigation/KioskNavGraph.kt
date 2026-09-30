package com.buffrcheckpoint.kiosk.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.buffrcheckpoint.kiosk.about.ui.AboutDebugScreen
import com.buffrcheckpoint.kiosk.auth.AuthRepository
import com.buffrcheckpoint.kiosk.auth.ui.KioskSetupScreen
import com.buffrcheckpoint.kiosk.auth.ui.LoginScreen
import com.buffrcheckpoint.kiosk.checkin.assisted.ui.AssistedCheckInScreen
import com.buffrcheckpoint.kiosk.checkin.manual.ui.ManualCheckInScreen
import com.buffrcheckpoint.kiosk.checkin.qr.ui.QrScanScreen
import com.buffrcheckpoint.kiosk.checkin.ui.CheckInSuccessScreen
import com.buffrcheckpoint.kiosk.checkout.ui.VisitorSignOutScreen
import com.buffrcheckpoint.kiosk.devices.ui.DeviceListScreen
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.maintenance.ui.MaintenanceScreen
import com.buffrcheckpoint.kiosk.nfc.ui.NfcCheckInScreen
import com.buffrcheckpoint.kiosk.privacy.ui.PrivacyNoticeScreen
import com.buffrcheckpoint.kiosk.roster.ui.RosterScreen
import com.buffrcheckpoint.kiosk.session.AbandonVisitorCheckInUseCase
import com.buffrcheckpoint.kiosk.session.ProtectedDraftClearanceService
import com.buffrcheckpoint.kiosk.session.VisitorSessionTimeoutController
import com.buffrcheckpoint.kiosk.ussd.ui.UssdInstructionsScreen
import com.buffrcheckpoint.kiosk.ui.theme.BuffrCheckpointTheme
import com.buffrcheckpoint.kiosk.welcome.ui.WelcomeScreen

@Composable
fun KioskNavGraph(
    authRepository: AuthRepository,
    experienceRepository: ExperienceRepository,
    draftClearance: ProtectedDraftClearanceService,
    abandonCheckIn: AbandonVisitorCheckInUseCase,
    navController: NavHostController = rememberNavController(),
) {
    val startDestination = when {
        !authRepository.hasSiteConfiguration() -> KioskDestinations.KIOSK_SETUP
        !authRepository.isLoggedIn() -> KioskDestinations.LOGIN
        else -> {
            val cached = experienceRepository.loadCached()
            if (cached.maintenanceModeEnabled) KioskDestinations.MAINTENANCE else KioskDestinations.WELCOME
        }
    }

    var experience by remember { mutableStateOf(experienceRepository.loadCached()) }
    var technicianEscapePending by remember { mutableStateOf(false) }
    // The kiosk device stays logged in for a whole shift (CredentialStore),
    // so an isLoggedIn() check here would never actually challenge anyone —
    // "Staff" always forces a fresh LoginScreen credential entry, unlike the
    // technician-escape path above which only challenges when logged out.
    // Closes the gap where any visitor could tap "Staff" and see every
    // other visitor's name and host with no gate at all.
    var staffRosterPending by remember { mutableStateOf(false) }

    fun resetToWelcome() {
        abandonCheckIn.execute {
            navController.navigate(KioskDestinations.WELCOME) {
                popUpTo(KioskDestinations.WELCOME) { inclusive = true }
            }
        }
    }

    BuffrCheckpointTheme(
        brandColourToken = experience.brandColourToken,
        largeTextEnabled = experience.accessibilityLargeTextEnabled,
    ) {
        VisitorSessionTimeoutController(
            experience = experience,
            enabled = authRepository.isLoggedIn(),
            onSessionExpired = { resetToWelcome() },
        ) {
            NavHost(navController = navController, startDestination = startDestination) {
            composable(KioskDestinations.KIOSK_SETUP) {
                KioskSetupScreen(
                    onProvisioned = {
                        navController.navigate(KioskDestinations.LOGIN) {
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(KioskDestinations.LOGIN) {
                LoginScreen(
                    onLoggedIn = {
                        if (technicianEscapePending) {
                            technicianEscapePending = false
                            navController.navigate(KioskDestinations.ABOUT_DEBUG) {
                                launchSingleTop = true
                            }
                            return@LoginScreen
                        }
                        if (staffRosterPending) {
                            staffRosterPending = false
                            navController.navigate(KioskDestinations.HOME) {
                                launchSingleTop = true
                            }
                            return@LoginScreen
                        }
                        val cached = experienceRepository.loadCached()
                        val target = if (cached.maintenanceModeEnabled) {
                            KioskDestinations.MAINTENANCE
                        } else {
                            KioskDestinations.WELCOME
                        }
                        navController.navigate(target) {
                            popUpTo(KioskDestinations.KIOSK_SETUP) { inclusive = true }
                        }
                    },
                    onBackToSetup = {
                        if (!navController.popBackStack()) {
                            navController.navigate(KioskDestinations.KIOSK_SETUP) {
                                launchSingleTop = true
                            }
                        }
                    },
                )
            }
            composable(KioskDestinations.MAINTENANCE) {
                MaintenanceScreen(
                    message = experience.maintenanceMessage,
                    assistedEntryDirection = experience.assistedEntryDirection,
                    onTechnicianEntry = {
                        if (authRepository.isLoggedIn()) {
                            navController.navigate(KioskDestinations.ABOUT_DEBUG) {
                                launchSingleTop = true
                            }
                        } else {
                            technicianEscapePending = true
                            navController.navigate(KioskDestinations.LOGIN) {
                                launchSingleTop = true
                            }
                        }
                    },
                )
            }
            composable(KioskDestinations.WELCOME) {
                WelcomeScreen(
                    onSelfCheckIn = { navController.navigate(KioskDestinations.privacyNotice("manual_check_in")) },
                    onAssistedCheckIn = { navController.navigate(KioskDestinations.ASSISTED_CHECK_IN) },
                    onQrCheckIn = { navController.navigate(KioskDestinations.privacyNotice("qr_check_in")) },
                    onNfcCheckIn = { navController.navigate(KioskDestinations.privacyNotice("nfc_check_in")) },
                    onStaffRoster = {
                        staffRosterPending = true
                        navController.navigate(KioskDestinations.LOGIN) {
                            launchSingleTop = true
                        }
                    },
                    onPrivacyNotice = { navController.navigate(KioskDestinations.privacyNotice("manual_check_in")) },
                    onUssdInstructions = { navController.navigate(KioskDestinations.USSD_INSTRUCTIONS) },
                    onSignOut = { navController.navigate(KioskDestinations.VISITOR_SIGN_OUT) },
                    onExperienceLoaded = { experience = experienceRepository.loadCached() },
                )
            }
            composable(KioskDestinations.USSD_INSTRUCTIONS) {
                UssdInstructionsScreen(onBack = { navController.popBackStack() })
            }
            composable(KioskDestinations.VISITOR_SIGN_OUT) {
                VisitorSignOutScreen(
                    onDone = { navController.popBackStack(KioskDestinations.WELCOME, inclusive = false) },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(
                route = KioskDestinations.PRIVACY_NOTICE,
                arguments = listOf(
                    navArgument("nextRoute") {
                        type = NavType.StringType
                        defaultValue = "manual_check_in"
                    },
                ),
            ) { backStackEntry ->
                val nextRoute = backStackEntry.arguments?.getString("nextRoute") ?: "manual_check_in"
                val captureChannel = when (nextRoute) {
                    "qr_check_in" -> "qr"
                    "nfc_check_in" -> "nfc_badge"
                    else -> "kiosk"
                }
                PrivacyNoticeScreen(
                    captureChannelCode = captureChannel,
                    onAccepted = {
                        when (nextRoute) {
                            "qr_check_in" -> navController.navigate(KioskDestinations.QR_CHECK_IN)
                            "nfc_check_in" -> navController.navigate(KioskDestinations.NFC_CHECK_IN)
                            else -> navController.navigate(KioskDestinations.manualCheckIn())
                        }
                    },
                    onBack = {
                        abandonCheckIn.execute { navController.popBackStack() }
                    },
                )
            }
            composable(KioskDestinations.HOME) {
                RosterScreen(
                    onStartManualCheckIn = { navController.navigate(KioskDestinations.manualCheckIn()) },
                    onStartAssistedCheckIn = { navController.navigate(KioskDestinations.ASSISTED_CHECK_IN) },
                    onStartQrCheckIn = { navController.navigate(KioskDestinations.QR_CHECK_IN) },
                    onDevices = { navController.navigate(KioskDestinations.DEVICE_LIST) },
                    onAbout = { navController.navigate(KioskDestinations.ABOUT_DEBUG) },
                )
            }
            composable(KioskDestinations.DEVICE_LIST) {
                DeviceListScreen(onBack = { navController.popBackStack() })
            }
            composable(KioskDestinations.ABOUT_DEBUG) {
                AboutDebugScreen(onBack = { navController.popBackStack() })
            }
            composable(KioskDestinations.NFC_CHECK_IN) {
                NfcCheckInScreen(
                    onSuccess = { visitId ->
                        navController.navigate(KioskDestinations.checkInSuccess(visitId)) {
                            popUpTo(KioskDestinations.WELCOME)
                        }
                    },
                    onBack = { abandonCheckIn.execute { navController.popBackStack() } },
                )
            }
            composable(
                route = KioskDestinations.MANUAL_CHECK_IN,
                arguments = listOf(
                    navArgument("invitationId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
                    navArgument("hostId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
                ),
            ) { backStackEntry ->
                ManualCheckInScreen(
                    assisted = false,
                    initialInvitationId = backStackEntry.arguments?.getString("invitationId"),
                    initialHostId = backStackEntry.arguments?.getString("hostId"),
                    onSubmitted = { visitId, visitorName, hostName, hostDepartment, visitorTypeCode ->
                        navController.navigate(
                            KioskDestinations.checkInSuccess(
                                visitId = visitId,
                                visitorName = visitorName,
                                hostName = hostName,
                                hostDepartment = hostDepartment,
                                visitorTypeCode = visitorTypeCode,
                            ),
                        ) {
                            popUpTo(KioskDestinations.WELCOME)
                        }
                    },
                )
            }
            composable(KioskDestinations.ASSISTED_CHECK_IN) {
                AssistedCheckInScreen(
                    onSubmitted = { visitId, visitorName, hostName, hostDepartment, visitorTypeCode ->
                        navController.navigate(
                            KioskDestinations.checkInSuccess(
                                visitId = visitId,
                                visitorName = visitorName,
                                hostName = hostName,
                                hostDepartment = hostDepartment,
                                visitorTypeCode = visitorTypeCode,
                            ),
                        ) {
                            popUpTo(KioskDestinations.WELCOME)
                        }
                    },
                )
            }
            composable(KioskDestinations.QR_CHECK_IN) {
                QrScanScreen(
                    onInvitationScanned = { invitationId, hostId ->
                        navController.navigate(KioskDestinations.manualCheckIn(invitationId, hostId)) {
                            popUpTo(KioskDestinations.QR_CHECK_IN) { inclusive = true }
                        }
                    },
                    onBack = { abandonCheckIn.execute { navController.popBackStack() } },
                )
            }
            composable(
                route = KioskDestinations.CHECK_IN_SUCCESS,
                arguments = listOf(
                    navArgument("visitId") { defaultValue = "" },
                    navArgument("visitorName") {
                        type = NavType.StringType
                        defaultValue = ""
                    },
                    navArgument("hostName") {
                        type = NavType.StringType
                        defaultValue = ""
                    },
                    navArgument("hostDepartment") {
                        type = NavType.StringType
                        defaultValue = ""
                    },
                    navArgument("visitorTypeCode") {
                        type = NavType.StringType
                        defaultValue = "general"
                    },
                ),
            ) { backStackEntry ->
                CheckInSuccessScreen(
                    visitId = backStackEntry.arguments?.getString("visitId").orEmpty(),
                    visitorName = backStackEntry.arguments?.getString("visitorName").orEmpty(),
                    hostName = backStackEntry.arguments?.getString("hostName").orEmpty(),
                    hostDepartment = backStackEntry.arguments?.getString("hostDepartment").orEmpty(),
                    visitorTypeCode = backStackEntry.arguments?.getString("visitorTypeCode").orEmpty().ifBlank { "general" },
                    onDone = { resetToWelcome() },
                )
            }
            }
        }
    }
}
