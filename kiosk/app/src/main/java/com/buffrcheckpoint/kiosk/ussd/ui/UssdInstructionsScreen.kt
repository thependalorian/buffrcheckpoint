package com.buffrcheckpoint.kiosk.ussd.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.ussd.UssdInstructionsViewModel

@Composable
fun UssdInstructionsScreen(
    onBack: () -> Unit,
    viewModel: UssdInstructionsViewModel = hiltViewModel(),
) {
    val state = viewModel.uiState

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(
            modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Feature phone check-in", style = MaterialTheme.typography.headlineMedium)
            Text(
                text = "If you do not have a smartphone, you can register your arrival using USSD on MTC or Telecom Namibia.",
                style = MaterialTheme.typography.bodyLarge,
            )
            Text(
                text = "1. Dial ${state.ussdShortCode} on your feature phone.\n2. Follow the voice/SMS prompts to enter your visit reference or host name.\n3. Wait for reception to confirm your entry.",
                style = MaterialTheme.typography.bodyLarge,
            )
            Text(
                text = "Reception: ${state.helpContactReference ?: "ask at the front desk"}",
                style = MaterialTheme.typography.bodyMedium,
            )
            if (!state.ussdCapabilityLive) {
                Text(
                    text = "USSD check-in is not live at this site yet. Please use assisted check-in at reception.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
            Text("Back to welcome")
        }
    }
}
