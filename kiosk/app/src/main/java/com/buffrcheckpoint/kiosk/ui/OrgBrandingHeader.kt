package com.buffrcheckpoint.kiosk.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState

/**
 * Compact org chrome shared by Welcome, check-in, privacy, and success screens.
 */
@Composable
fun OrgBrandingHeader(
    experience: KioskExperienceState,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val logoHeight = if (compact) 48.dp else 88.dp
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        RemoteLogoImage(
            url = experience.logoUrl,
            contentDescription = experience.organisationDisplayName,
            modifier = Modifier.height(logoHeight).padding(bottom = if (compact) 8.dp else 16.dp),
        )
        Text(
            text = experience.organisationDisplayName ?: "Checkpoint",
            style = if (compact) MaterialTheme.typography.titleLarge else MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Text(
            text = experience.siteDisplayName ?: "Visitor reception",
            style = if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
