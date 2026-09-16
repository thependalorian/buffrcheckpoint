package com.buffrcheckpoint.kiosk.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.auth.KioskSetupViewModel
import com.buffrcheckpoint.kiosk.ui.KioskOnboardingScaffold

@Composable
fun KioskSetupScreen(
    onProvisioned: () -> Unit,
    viewModel: KioskSetupViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.provisioned) {
        if (state.provisioned) onProvisioned()
    }

    KioskOnboardingScaffold(title = "Kiosk setup") { _ ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                "First-run only. Ask your site administrator for these values.",
                style = MaterialTheme.typography.bodyMedium,
            )
            OutlinedTextField(
                value = state.baseUrl,
                onValueChange = viewModel::onBaseUrlChange,
                label = { Text("Backend base URL") },
                placeholder = { Text("http://10.0.2.2:3001/") },
                modifier = Modifier.widthIn(max = 480.dp).padding(top = 24.dp),
            )
            OutlinedTextField(
                value = state.siteId,
                onValueChange = viewModel::onSiteIdChange,
                label = { Text("Site ID") },
                modifier = Modifier.widthIn(max = 480.dp).padding(top = 12.dp),
            )
            state.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
            }
            Button(onClick = viewModel::save, modifier = Modifier.padding(top = 24.dp)) {
                Text("Continue")
            }
        }
    }
}
