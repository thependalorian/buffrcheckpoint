package com.buffrcheckpoint.kiosk.checkin.manual.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.checkin.manual.ManualCheckInViewModel
import com.buffrcheckpoint.kiosk.core.domain.model.VisitorType
import com.buffrcheckpoint.kiosk.core.network.dto.HostRowDto

/**
 * Reused for both the self-service kiosk flow and the assisted (front-desk
 * staff-operated) flow — [assisted] flips only the captureChannelCode the
 * submission is attributed with, not the form itself.
 */
@Composable
fun ManualCheckInScreen(
    assisted: Boolean,
    onSubmitted: (visitId: String, visitorName: String, hostName: String, hostDepartment: String, visitorTypeCode: String) -> Unit,
    initialInvitationId: String? = null,
    initialHostId: String? = null,
    viewModel: ManualCheckInViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    DisposableEffect(Unit) {
        onDispose { viewModel.resetForm() }
    }

    LaunchedEffect(assisted) { viewModel.setAssistedChannel(assisted) }
    LaunchedEffect(initialInvitationId) { initialInvitationId?.let(viewModel::prefillInvitationId) }
    LaunchedEffect(initialHostId, state.hosts) {
        initialHostId?.let(viewModel::prefillHostId)
    }
    LaunchedEffect(state.submittedVisitId) {
        state.submittedVisitId?.let { visitId ->
            onSubmitted(
                visitId,
                state.visitorName.trim(),
                state.hostDisplayName.trim(),
                state.hostDepartment.trim(),
                state.visitorType.code,
            )
        }
    }

    val coreFieldCodes = setOf(
        "visitor_name",
        "visitor_phone",
        "host",
        "visitor_type",
        "visitor_category",
    )
    val extraFields = state.effectiveForm?.fields.orEmpty().filter { it.fieldCode !in coreFieldCodes }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
    ) {
        Text(
            if (assisted) "Assisted check-in" else "Visitor check-in",
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            "You are checking in at reception. Choose who you are here to see.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        OutlinedTextField(
            value = state.visitorName,
            onValueChange = viewModel::onVisitorNameChange,
            label = { Text("Visitor name") },
            modifier = Modifier.widthIn(max = 520.dp).padding(top = 16.dp),
        )
        OutlinedTextField(
            value = state.visitorPhone,
            onValueChange = viewModel::onVisitorPhoneChange,
            label = { Text("Phone (optional)") },
            modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
        )

        HostDropdown(
            hosts = state.hosts,
            selectedLabel = when {
                state.hostDisplayName.isNotBlank() && state.hostDepartment.isNotBlank() ->
                    "${state.hostDisplayName} — ${state.hostDepartment}"
                state.hostDisplayName.isNotBlank() -> state.hostDisplayName
                state.hostId.isNotBlank() -> state.hostId
                else -> ""
            },
            onSelected = viewModel::onHostSelected,
            modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
        )

        VisitorTypeDropdown(
            selected = state.visitorType,
            onSelected = viewModel::onVisitorTypeChange,
            modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
        )

        extraFields.forEach { field ->
            OutlinedTextField(
                value = state.extraAnswers[field.fieldCode].orEmpty(),
                onValueChange = { viewModel.onExtraAnswerChange(field.fieldCode, it) },
                label = {
                    Text(if (field.required) field.fieldLabel else "${field.fieldLabel} (optional)")
                },
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
            )
        }

        state.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
        }

        Button(
            onClick = viewModel::submit,
            enabled = !state.isSubmitting,
            modifier = Modifier.padding(top = 24.dp),
        ) {
            if (state.isSubmitting) {
                CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp))
            }
            Text("Check in")
        }
    }
}

@Composable
private fun HostDropdown(
    hosts: List<HostRowDto>,
    selectedLabel: String,
    onSelected: (hostId: String, displayName: String, department: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        OutlinedTextField(
            value = selectedLabel.ifBlank {
                if (hosts.isEmpty()) "Loading hosts…" else "Select who you are visiting…"
            },
            onValueChange = {},
            readOnly = true,
            label = { Text("Who are you visiting?") },
            modifier = Modifier.widthIn(max = 520.dp),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            hosts.forEach { host ->
                val department = host.department.orEmpty()
                DropdownMenuItem(
                    text = {
                        Text(
                            if (department.isNotBlank()) {
                                "${host.displayName} — $department"
                            } else {
                                host.displayName
                            },
                        )
                    },
                    onClick = {
                        onSelected(host.id, host.displayName, department)
                        expanded = false
                    },
                )
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable(enabled = hosts.isNotEmpty()) { expanded = true },
        )
    }
}

@Composable
private fun VisitorTypeDropdown(
    selected: VisitorType,
    onSelected: (VisitorType) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        OutlinedTextField(
            value = selected.name,
            onValueChange = {},
            readOnly = true,
            label = { Text("Visitor type") },
            modifier = Modifier.widthIn(max = 520.dp),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            VisitorType.entries.forEach { type ->
                DropdownMenuItem(text = { Text(type.name) }, onClick = { onSelected(type); expanded = false })
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable { expanded = true },
        )
    }
}
