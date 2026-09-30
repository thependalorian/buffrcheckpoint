package com.buffrcheckpoint.kiosk.checkin.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.ui.OrgBrandingHeader
import kotlinx.coroutines.delay

/**
 * Front-desk success: visitor waits for their host/department at reception.
 * Soft visitor pass shows a confirmation code (FR-K12 soft path — no printer SDK).
 */
@Composable
fun CheckInSuccessScreen(
    visitId: String,
    visitorName: String = "",
    hostName: String = "",
    hostDepartment: String = "",
    visitorTypeCode: String = "general",
    onDone: () -> Unit,
    autoReturnAfterMillis: Long = 12000,
    viewModel: CheckInSuccessViewModel = hiltViewModel(),
) {
    val experience = viewModel.experienceRepository.loadCached()

    LaunchedEffect(visitId) {
        if (visitId.isNotBlank()) {
            viewModel.experienceRepository.acknowledgePendingPolicy(visitId)
        }
        delay(autoReturnAfterMillis)
        onDone()
    }

    val firstName = visitorName.trim().split(Regex("\\s+")).firstOrNull().orEmpty()
    val host = hostName.trim().ifBlank { "your host" }
    val department = hostDepartment.trim()
    val hostLabel = if (department.isNotBlank()) "$host ($department)" else host
    val badgeRequired = visitorTypeCode in setOf("contractor", "temporary_staff", "restricted_site")
    val confirmationCode = visitId.replace("-", "").take(8).uppercase()
    val headline = if (firstName.isNotBlank()) {
        "$firstName, wait for $host"
    } else {
        "Wait for $host"
    }
    val instruction = when (visitorTypeCode) {
        "delivery" ->
            "Please wait at reception. $hostLabel has been notified about your delivery and will meet you here."
        "interview" ->
            "Please wait at reception. $hostLabel has been notified and will collect you for your interview."
        else ->
            "Please wait at reception. $hostLabel has been notified and will come to meet you, or reception will call them."
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        OrgBrandingHeader(
            experience = experience,
            compact = true,
            modifier = Modifier.padding(bottom = 24.dp),
        )
        Text(headline, style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
        Text(
            "Meeting: $hostLabel",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 12.dp),
            textAlign = TextAlign.Center,
        )
        Text(
            instruction,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 12.dp),
            textAlign = TextAlign.Center,
        )
        Card(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
            Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    if (badgeRequired) "Visitor pass" else "Visit confirmation",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    confirmationCode,
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
                if (visitorName.isNotBlank()) {
                    Text(visitorName.trim(), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(top = 8.dp))
                }
                Text(hostLabel, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                if (badgeRequired) {
                    Text(
                        "Collect your temporary badge from reception before you leave the desk.",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 8.dp),
                        textAlign = TextAlign.Center,
                    )
                } else {
                    Text(
                        "Show this confirmation at reception if asked. Hardware badge printing is not required for this visit type.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 8.dp),
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
        Text(
            "Host notification was attempted — delivery is not yet confirmed.",
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 16.dp),
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Button(onClick = onDone, modifier = Modifier.padding(top = 24.dp)) {
            Text("Done")
        }
    }
}
