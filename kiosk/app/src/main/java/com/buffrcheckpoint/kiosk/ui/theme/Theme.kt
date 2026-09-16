package com.buffrcheckpoint.kiosk.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private fun parseBrandColour(token: String?): Color {
    if (token.isNullOrBlank()) return BuffrBlue
    val normalized = token.removePrefix("#")
    return runCatching {
        Color(("FF$normalized").toLong(16))
    }.getOrDefault(BuffrBlue)
}

@Composable
fun BuffrCheckpointTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    brandColourToken: String? = null,
    largeTextEnabled: Boolean = false,
    content: @Composable () -> Unit,
) {
    val primary = parseBrandColour(brandColourToken)
    val colorScheme = if (darkTheme) {
        darkColorScheme(primary = primary, secondary = BuffrTeal, error = BuffrRed)
    } else {
        lightColorScheme(
            primary = primary,
            onPrimary = BuffrWhite,
            secondary = BuffrSodiumYellow,
            onSecondary = BuffrCarbon,
            background = BuffrCloud,
            onBackground = BuffrCarbon,
            surface = BuffrWhite,
            onSurface = BuffrCarbon,
            surfaceVariant = BuffrCloud,
            onSurfaceVariant = BuffrSlate,
            outline = BuffrFrost,
            error = BuffrRed,
        )
    }
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
