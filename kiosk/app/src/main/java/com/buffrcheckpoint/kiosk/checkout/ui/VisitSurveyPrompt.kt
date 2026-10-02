package com.buffrcheckpoint.kiosk.checkout.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.buffrcheckpoint.kiosk.core.network.dto.SurveyOptionDto

/**
 * The optional one-tap rating shown after visitor sign-out (Section 8.7).
 * Stateless so it can be rendered and tested on its own.
 */
@Composable
fun VisitSurveyPrompt(
    successMessage: String?,
    options: List<SurveyOptionDto>,
    submitting: Boolean,
    onRate: (String) -> Unit,
    onSkip: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        successMessage?.let {
            Text(it, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
        }
        Text(
            "How was your visit today?",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(top = 24.dp),
        )
        Text(
            "Optional. One tap, no personal details.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(top = 20.dp),
        ) {
            options.forEach { option ->
                OutlinedButton(
                    onClick = { onRate(option.code) },
                    enabled = !submitting,
                    modifier = Modifier.testTag("survey-option-${option.code}"),
                ) {
                    Column {
                        Text(option.score.toString(), style = MaterialTheme.typography.titleLarge)
                        Text(option.label, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
        TextButton(onClick = onSkip, modifier = Modifier.padding(top = 20.dp).testTag("survey-skip")) {
            Text("Skip")
        }
    }
}
