package com.buffrcheckpoint.kiosk.checkin.manual.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
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
import com.buffrcheckpoint.kiosk.checkin.manual.CheckInFormFieldCodes
import com.buffrcheckpoint.kiosk.checkin.manual.ManualCheckInViewModel
import com.buffrcheckpoint.kiosk.core.domain.model.PurposeCategory
import com.buffrcheckpoint.kiosk.core.domain.model.VisitorType
import com.buffrcheckpoint.kiosk.core.network.dto.HostRowDto
import com.buffrcheckpoint.kiosk.ui.OrgBrandingHeader

/**
 * Shared self-service and assisted check-in form.
 *
 * Field set mirrors seed `0016_demo_check_in_form.sql` and website
 * `/check-in` (name, required mobile, required company, optional email /
 * ID / vehicle, host, purpose, visitor type) plus any extra fields from
 * the site's effective form version (FR-K09).
 *
 * [assisted] only changes capture-channel attribution and staff-facing copy —
 * validation and wire payload stay identical for uniformity with public check-in.
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

    val extraFields = state.effectiveForm?.fields.orEmpty()
        .filter { it.fieldCode !in CheckInFormFieldCodes.CORE }
        .filter { state.fieldVisible(it.fieldCode) }
        .sortedBy { it.displayOrder }

    val phoneRequired = state.fieldRequired(CheckInFormFieldCodes.VISITOR_PHONE, defaultRequired = true)
    val companyRequired = state.fieldRequired(CheckInFormFieldCodes.COMPANY_NAME, defaultRequired = true)
    val emailRequired = state.fieldRequired(CheckInFormFieldCodes.VISITOR_EMAIL, defaultRequired = false)
    val idRequired = state.fieldRequired(CheckInFormFieldCodes.ID_DOCUMENT_NUMBER, defaultRequired = false)
    val vehicleRequired = state.fieldRequired(CheckInFormFieldCodes.VEHICLE_REGISTRATION, defaultRequired = false)
    val purposeRequired = state.fieldRequired(CheckInFormFieldCodes.PURPOSE_CATEGORY, defaultRequired = false)
    val showVehicle = state.fieldVisible(CheckInFormFieldCodes.VEHICLE_REGISTRATION)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
    ) {
        OrgBrandingHeader(
            experience = viewModel.experience,
            compact = true,
            modifier = Modifier.padding(bottom = 16.dp),
        )
        Text(
            if (assisted) "Assisted check-in" else "Visitor check-in",
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            if (assisted) {
                "Staff entry — same fields as self-service and phone QR. Recorded as assisted."
            } else {
                "Complete the same details as the phone check-in form. Choose who you are here to see."
            },
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (state.isLoadingForm) {
            Text(
                "Loading site form…",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        } else if (state.effectiveForm != null) {
            Text(
                state.effectiveForm!!.formName ?: "Site check-in form",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        FieldWidth {
            OutlinedTextField(
                value = state.visitorName,
                onValueChange = viewModel::onVisitorNameChange,
                label = { Text(requiredLabel("Full name", required = true)) },
                singleLine = true,
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 16.dp),
            )
            OutlinedTextField(
                value = state.visitorPhone,
                onValueChange = viewModel::onVisitorPhoneChange,
                label = { Text(requiredLabel("Mobile number", phoneRequired)) },
                singleLine = true,
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
            )
            OutlinedTextField(
                value = state.companyName,
                onValueChange = viewModel::onCompanyNameChange,
                label = { Text(requiredLabel("Organisation / company", companyRequired)) },
                singleLine = true,
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
            )
            OutlinedTextField(
                value = state.visitorEmail,
                onValueChange = viewModel::onVisitorEmailChange,
                label = { Text(requiredLabel("Email", emailRequired)) },
                singleLine = true,
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
            )
            OutlinedTextField(
                value = state.idDocumentNumber,
                onValueChange = viewModel::onIdDocumentNumberChange,
                label = { Text(requiredLabel("ID / passport", idRequired)) },
                singleLine = true,
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
            )
            if (showVehicle) {
                OutlinedTextField(
                    value = state.vehicleRegistration,
                    onValueChange = viewModel::onVehicleRegistrationChange,
                    label = { Text(requiredLabel("Vehicle registration", vehicleRequired)) },
                    singleLine = true,
                    modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
                )
            }

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

            PurposeCategoryDropdown(
                selected = state.purposeCategory,
                required = purposeRequired,
                onSelected = viewModel::onPurposeCategoryChange,
                modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
            )

            extraFields.forEach { field ->
                OutlinedTextField(
                    value = state.extraAnswers[field.fieldCode].orEmpty(),
                    onValueChange = { viewModel.onExtraAnswerChange(field.fieldCode, it) },
                    label = { Text(requiredLabel(field.fieldLabel, field.required)) },
                    modifier = Modifier.widthIn(max = 520.dp).padding(top = 12.dp),
                )
            }
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
            Text(if (assisted) "Record assisted check-in" else "Check in")
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun FieldWidth(content: @Composable () -> Unit) {
    content()
}

private fun requiredLabel(label: String, required: Boolean): String =
    if (required) label else "$label (optional)"

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
            label = { Text(requiredLabel("Who are you visiting?", required = true)) },
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
            value = selected.displayLabel(),
            onValueChange = {},
            readOnly = true,
            label = { Text(requiredLabel("Visitor type", required = true)) },
            modifier = Modifier.widthIn(max = 520.dp),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            VisitorType.entries.forEach { type ->
                DropdownMenuItem(
                    text = { Text(type.displayLabel()) },
                    onClick = {
                        onSelected(type)
                        expanded = false
                    },
                )
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable { expanded = true },
        )
    }
}

@Composable
private fun PurposeCategoryDropdown(
    selected: PurposeCategory?,
    required: Boolean,
    onSelected: (PurposeCategory?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        OutlinedTextField(
            value = selected?.displayLabel().orEmpty().ifBlank {
                if (required) "Select purpose…" else "Purpose (optional)"
            },
            onValueChange = {},
            readOnly = true,
            label = { Text(requiredLabel("Purpose of visit", required)) },
            modifier = Modifier.widthIn(max = 520.dp),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            if (!required) {
                DropdownMenuItem(
                    text = { Text("None") },
                    onClick = {
                        onSelected(null)
                        expanded = false
                    },
                )
            }
            PurposeCategory.entries.forEach { purpose ->
                DropdownMenuItem(
                    text = { Text(purpose.displayLabel()) },
                    onClick = {
                        onSelected(purpose)
                        expanded = false
                    },
                )
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable { expanded = true },
        )
    }
}

private fun VisitorType.displayLabel(): String = when (this) {
    VisitorType.GENERAL -> "General visitor"
    VisitorType.PRE_REGISTERED -> "Pre-registered"
    VisitorType.CONTRACTOR -> "Contractor"
    VisitorType.DELIVERY -> "Delivery"
    VisitorType.INTERVIEW -> "Interview"
    VisitorType.GOVERNMENT_VIP -> "Government / VIP"
    VisitorType.HEALTHCARE -> "Healthcare"
    VisitorType.EVENT_ATTENDEE -> "Event attendee"
    VisitorType.TEMPORARY_STAFF -> "Temporary staff"
    VisitorType.RESTRICTED_SITE -> "Restricted site"
}

private fun PurposeCategory.displayLabel(): String = when (this) {
    PurposeCategory.BUSINESS -> "Business"
    PurposeCategory.PERSONAL -> "Personal"
    PurposeCategory.DELIVERY -> "Delivery"
    PurposeCategory.INTERVIEW -> "Interview"
    PurposeCategory.GOVERNMENT -> "Government"
    PurposeCategory.MEDICAL -> "Medical"
    PurposeCategory.MAINTENANCE -> "Maintenance / contractor work"
    PurposeCategory.EVENT -> "Event"
}
