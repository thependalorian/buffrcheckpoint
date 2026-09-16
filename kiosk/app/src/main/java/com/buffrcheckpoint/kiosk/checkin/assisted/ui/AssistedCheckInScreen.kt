package com.buffrcheckpoint.kiosk.checkin.assisted.ui

import androidx.compose.runtime.Composable
import com.buffrcheckpoint.kiosk.checkin.manual.ui.ManualCheckInScreen

/** Front-desk-operator-facing entry point — same form as self-service, attributed as "assisted". */
@Composable
fun AssistedCheckInScreen(
    onSubmitted: (visitId: String, visitorName: String, hostName: String, hostDepartment: String, visitorTypeCode: String) -> Unit,
) {
    ManualCheckInScreen(assisted = true, onSubmitted = onSubmitted)
}
