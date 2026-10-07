package com.buffrcheckpoint.kiosk.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

@Composable
fun BuffrCheckpointTheme(
    largeTextEnabled: Boolean = false,
    content: @Composable () -> Unit,
) {
    // Light only, high contrast: Sodium Yellow fills carry near-black text (white on yellow fails WCAG AA).
    val colorScheme = lightColorScheme(
        primary = BuffrSodiumYellow,
        onPrimary = BuffrCarbon,
        secondary = BuffrCharcoal,
        onSecondary = BuffrWhite,
        background = BuffrCloud,
        onBackground = BuffrCarbon,
        surface = BuffrWhite,
        onSurface = BuffrCarbon,
        surfaceVariant = BuffrCloud,
        onSurfaceVariant = BuffrSlate,
        outline = BuffrFrost,
        error = BuffrRed,
    )
    val typography = if (largeTextEnabled) {
        BuffrTypography.copy(
            displaySmall = BuffrTypography.displaySmall.copy(fontSize = BuffrTypography.displaySmall.fontSize * 1.2f),
            bodyLarge = BuffrTypography.bodyLarge.copy(fontSize = BuffrTypography.bodyLarge.fontSize * 1.15f),
            bodyMedium = BuffrTypography.bodyMedium.copy(fontSize = BuffrTypography.bodyMedium.fontSize * 1.15f),
        )
    } else {
        BuffrTypography
    }
    MaterialTheme(
        colorScheme = colorScheme,
        typography = typography,
        content = content,
    )
}
