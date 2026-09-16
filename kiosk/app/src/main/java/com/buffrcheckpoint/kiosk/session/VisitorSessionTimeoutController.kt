package com.buffrcheckpoint.kiosk.session

import androidx.compose.runtime.Composable
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState

@Composable
fun VisitorSessionTimeoutController(
    experience: KioskExperienceState,
    enabled: Boolean,
    onSessionExpired: () -> Unit,
    content: @Composable () -> Unit,
) {
    KioskIdleHandler(
        experience = experience,
        enabled = enabled,
        onSessionExpired = onSessionExpired,
        content = content,
    )
}
