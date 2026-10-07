package com.buffrcheckpoint.kiosk.checkout.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.buffrcheckpoint.kiosk.checkout.MAX_SURVEY_COMMENT
import com.buffrcheckpoint.kiosk.core.network.dto.SurveyOptionDto

/**
 * The optional rating shown after visitor sign-out (Section 8.7): choose 1 to 5, optionally add a comment, then send.
 * Stateless apart from what the visitor is typing, so it can be rendered and tested on its own.
 */
@Composable
fun VisitSurveyPrompt(
    successMessage: String?,
    options: List<SurveyOptionDto>,
    submitting: Boolean,
    onRate: (code: String, comment: String?) -> Unit,
    onSkip: () -> Unit,
) {
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    var comment by rememberSaveable { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
        successMessage?.let {
            Text(it, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
        }
        Text(
            "How was your visit today?",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(top = 24.dp),
        )
        Text(
            "Optional. Choose 1 to 5, add a comment if you like, and leave out personal details.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(top = 20.dp),
        ) {
            options.forEach { option ->
                val chosen = selected == option.code
                val content: @Composable () -> Unit = {
                    Column {
                        Text(option.score.toString(), style = MaterialTheme.typography.titleLarge)
                        Text(option.label, style = MaterialTheme.typography.labelSmall)
                    }
                }
                if (chosen) {
                    Button(
                        onClick = { selected = option.code },
                        enabled = !submitting,
                        modifier = Modifier.testTag("survey-option-${option.code}"),
                        content = { content() },
                    )
                } else {
                    OutlinedButton(
                        onClick = { selected = option.code },
                        enabled = !submitting,
                        modifier = Modifier.testTag("survey-option-${option.code}"),
                        content = { content() },
                    )
                }
            }
        }
        OutlinedTextField(
            value = comment,
            onValueChange = { comment = it.take(MAX_SURVEY_COMMENT) },
            label = { Text("Anything we should know? (optional)") },
            supportingText = { Text("${MAX_SURVEY_COMMENT - comment.length} characters left") },
            enabled = !submitting,
            minLines = 3,
            maxLines = 6,
            modifier = Modifier.fillMaxWidth().padding(top = 20.dp).testTag("survey-comment"),
        )
        Button(
            onClick = { selected?.let { onRate(it, comment) } },
            enabled = selected != null && !submitting,
            modifier = Modifier.padding(top = 16.dp).testTag("survey-submit"),
        ) {
            Text("Send feedback")
        }
        TextButton(onClick = onSkip, modifier = Modifier.padding(top = 8.dp).testTag("survey-skip")) {
            Text("Skip")
        }
    }
}
