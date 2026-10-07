package com.buffrcheckpoint.kiosk.checkout.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.checkout.VisitorSignOutViewModel
import kotlinx.coroutines.delay

/** The rating screen returns to the welcome screen on its own after this long. */
private const val SURVEY_AUTO_RETURN_MS = 20_000L

@Composable
fun VisitorSignOutScreen(
    onDone: () -> Unit,
    onBack: () -> Unit,
    viewModel: VisitorSignOutViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    if (state.surveyToken != null) {
        // A shared kiosk must never wait on one visitor: skip after a timeout.
        LaunchedEffect(state.surveyToken) {
            delay(SURVEY_AUTO_RETURN_MS)
            onDone()
        }
        VisitSurveyPrompt(
            successMessage = state.successMessage,
            options = state.surveyOptions,
            submitting = state.surveySubmitting,
            onRate = { code, comment -> viewModel.submitRating(code, comment, onDone) },
            onSkip = onDone,
        )
        return
    }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Sign out", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Enter the mobile number used at check-in. This does not show a visitor directory.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = state.visitorPhone,
            onValueChange = viewModel::onPhoneChange,
            label = { Text("Mobile phone") },
            modifier = Modifier.widthIn(max = 520.dp).padding(top = 16.dp),
        )
        state.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
        }
        state.successMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 12.dp))
        }
        Button(
            onClick = { viewModel.signOut(onDone) },
            enabled = !state.isSubmitting,
            modifier = Modifier.padding(top = 24.dp),
        ) {
            if (state.isSubmitting) CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp))
            Text("Sign out")
        }
        Button(onClick = onBack, modifier = Modifier.padding(top = 12.dp)) {
            Text("Back")
        }
    }
}
