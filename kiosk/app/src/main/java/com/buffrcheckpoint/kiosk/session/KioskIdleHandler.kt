package com.buffrcheckpoint.kiosk.session

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState
import kotlinx.coroutines.delay

@Composable
fun KioskIdleHandler(
    experience: KioskExperienceState,
    enabled: Boolean,
    onSessionExpired: () -> Unit,
    content: @Composable () -> Unit,
) {
    var lastInteraction by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var showWarning by remember { mutableStateOf(false) }

    fun bumpInteraction() {
        lastInteraction = System.currentTimeMillis()
        showWarning = false
    }

    LaunchedEffect(enabled, experience.idleTimeoutSeconds, experience.idleWarningSeconds, lastInteraction) {
        if (!enabled) return@LaunchedEffect
        while (true) {
            delay(1000)
            val idleSeconds = (System.currentTimeMillis() - lastInteraction) / 1000
            when {
                idleSeconds >= experience.idleTimeoutSeconds -> {
                    showWarning = false
                    onSessionExpired()
                    lastInteraction = System.currentTimeMillis()
                }
                idleSeconds >= (experience.idleTimeoutSeconds - experience.idleWarningSeconds) -> {
                    showWarning = true
                }
                else -> showWarning = false
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Initial)
                        if (event.changes.any { it.pressed || it.previousPressed }) {
                            bumpInteraction()
                        }
                    }
                }
            },
    ) {
        content()
    }

    if (showWarning) {
        AlertDialog(
            onDismissRequest = { bumpInteraction() },
            title = { Text("Still there?") },
            text = { Text("This session will reset soon to protect visitor privacy.") },
            confirmButton = {
                TextButton(onClick = { bumpInteraction() }) {
                    Text("Continue")
                }
            },
        )
    }
}
