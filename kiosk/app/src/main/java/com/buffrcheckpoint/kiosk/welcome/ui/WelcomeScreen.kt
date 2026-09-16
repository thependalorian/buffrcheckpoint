package com.buffrcheckpoint.kiosk.welcome.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.ui.QrCodeImage
import com.buffrcheckpoint.kiosk.ui.RemoteLogoImage
import com.buffrcheckpoint.kiosk.ui.theme.BuffrFrost
import com.buffrcheckpoint.kiosk.welcome.WelcomeViewModel

@Composable
fun WelcomeScreen(
    onSelfCheckIn: () -> Unit,
    onAssistedCheckIn: () -> Unit,
    onQrCheckIn: () -> Unit,
    onNfcCheckIn: () -> Unit = onAssistedCheckIn,
    onStaffRoster: () -> Unit,
    onPrivacyNotice: () -> Unit,
    onUssdInstructions: () -> Unit = onPrivacyNotice,
    onSignOut: () -> Unit = {},
    onExperienceLoaded: () -> Unit = {},
    viewModel: WelcomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val experience = state.experience
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showAccessibilityDialog by remember { mutableStateOf(false) }

    LaunchedEffect(state.isLoading) {
        if (!state.isLoading) onExperienceLoaded()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 32.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(modifier = Modifier.padding(top = 48.dp))
            } else {
                WelcomeBrandingHeader(experience = experience)
                state.errorMessage?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(top = 8.dp),
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        if (!state.isLoading) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(24.dp),
                verticalAlignment = Alignment.Top,
            ) {
                PublicCheckInQrCard(
                    payload = experience.publicCheckInQrPayload,
                    label = experience.publicCheckInQrLabel ?: "Scan to check in on your phone",
                    organisationName = experience.organisationDisplayName,
                    modifier = Modifier.weight(1f),
                )

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Check in at this kiosk",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = experience.welcomeMessage,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    if (viewModel.isChannelEnabled("kiosk")) {
                        Button(onClick = onSelfCheckIn, modifier = Modifier.fillMaxWidth()) {
                            Text("Self check-in")
                        }
                    }
                    if (viewModel.isChannelEnabled("assisted")) {
                        OutlinedButton(onClick = onAssistedCheckIn, modifier = Modifier.fillMaxWidth()) {
                            Text("Assisted check-in")
                        }
                    }
                    if (viewModel.isQrInvitationEnabled()) {
                        OutlinedButton(onClick = onQrCheckIn, modifier = Modifier.fillMaxWidth()) {
                            Text("Scan invitation QR")
                        }
                    }
                    if (viewModel.isNfcEnabled()) {
                        OutlinedButton(onClick = onNfcCheckIn, modifier = Modifier.fillMaxWidth()) {
                            Text("Tap NFC badge")
                        }
                    }
                    if (viewModel.isUssdEnabled()) {
                        OutlinedButton(onClick = onUssdInstructions, modifier = Modifier.fillMaxWidth()) {
                            Text("Feature phone (USSD)")
                        }
                    }
                    OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
                        Text("Sign out")
                    }
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedButton(onClick = onPrivacyNotice) { Text("Privacy") }
            OutlinedButton(onClick = { showLanguageDialog = true }) {
                Text("Language (${experience.selectedLanguageCode.uppercase()})")
            }
            OutlinedButton(onClick = { showAccessibilityDialog = true }) { Text("Accessibility") }
            OutlinedButton(onClick = onStaffRoster) { Text("Staff") }
        }
    }

    if (showLanguageDialog) {
        AlertDialog(
            onDismissRequest = { showLanguageDialog = false },
            title = { Text("Choose language") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    experience.languageCodes.forEach { code ->
                        TextButton(onClick = {
                            viewModel.selectLanguage(code)
                            showLanguageDialog = false
                        }) {
                            Text(code.uppercase())
                        }
                    }
                }
            },
            confirmButton = {},
        )
    }

    if (showAccessibilityDialog) {
        AlertDialog(
            onDismissRequest = { showAccessibilityDialog = false },
            title = { Text("Accessibility") },
            text = {
                Text(
                    if (experience.accessibilityLargeTextEnabled) {
                        "Large text is enabled for this kiosk. Ask reception if you need additional assistance."
                    } else {
                        "Standard text size is active. Contact ${experience.helpContactReference ?: "reception"} for assistance."
                    },
                )
            },
            confirmButton = {
                TextButton(onClick = { showAccessibilityDialog = false }) { Text("Close") }
            },
        )
    }
}

@Composable
private fun WelcomeBrandingHeader(
    experience: com.buffrcheckpoint.kiosk.experience.KioskExperienceState,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        RemoteLogoImage(
            url = experience.logoUrl,
            contentDescription = experience.organisationDisplayName,
            modifier = Modifier.height(88.dp).padding(bottom = 16.dp),
        )
        Text(
            text = experience.organisationDisplayName ?: "Buffr Checkpoint",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Text(
            text = experience.siteDisplayName ?: "Visitor reception",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
private fun PublicCheckInQrCard(
    payload: String?,
    label: String,
    organisationName: String?,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.widthIn(min = 280.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Use your phone",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Box(
                modifier = Modifier
                    .size(220.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, BuffrFrost, RoundedCornerShape(12.dp))
                    .padding(12.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (payload.isNullOrBlank()) {
                    CircularProgressIndicator(modifier = Modifier.size(48.dp))
                } else {
                    QrCodeImage(
                        payload = payload,
                        contentDescription = label,
                        modifier = Modifier.fillMaxSize(),
                        sizePx = 512,
                    )
                }
            }
            Text(
                text = organisationName ?: "This site",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}
