package com.buffrcheckpoint.kiosk.checkin.assisted.ui

import androidx.compose.runtime.Composable
import com.buffrcheckpoint.kiosk.checkin.manual.ui.ManualCheckInScreen

/**
 * Front-desk assisted entry — **same production field set** as self-service
 * and website `/check-in` (uniformity with CheckInDto + seed 0016).
 *
 * Differentiator is capture channel (`assisted`) and staff-facing chrome/copy
 * inside [ManualCheckInScreen], not a reduced form.
 */
@Composable
fun AssistedCheckInScreen(
    onSubmitted: (visitId: String, visitorName: String, hostName: String, hostDepartment: String, visitorTypeCode: String) -> Unit,
) {
    ManualCheckInScreen(assisted = true, onSubmitted = onSubmitted)
}
