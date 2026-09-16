package com.buffrcheckpoint.kiosk.checkin.manual

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.checkin.CheckInRepository
import com.buffrcheckpoint.kiosk.checkin.CheckInSubmitResult
import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.FormAnswerDraft
import com.buffrcheckpoint.kiosk.core.domain.model.CaptureChannel
import com.buffrcheckpoint.kiosk.core.domain.model.PurposeCategory
import com.buffrcheckpoint.kiosk.core.domain.model.VisitorType
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.EffectiveCheckInFormDto
import com.buffrcheckpoint.kiosk.core.network.dto.HostRowDto
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import com.buffrcheckpoint.kiosk.session.ProtectedDraftClearanceService
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ManualCheckInUiState(
    val visitorName: String = "",
    val visitorPhone: String = "",
    val hostId: String = "",
    val hostDisplayName: String = "",
    val hostDepartment: String = "",
    val visitorType: VisitorType = VisitorType.GENERAL,
    val purposeCategory: PurposeCategory? = null,
    val invitationId: String? = null,
    val isAssistedChannel: Boolean = false,
    val hosts: List<HostRowDto> = emptyList(),
    val effectiveForm: EffectiveCheckInFormDto? = null,
    val extraAnswers: Map<String, String> = emptyMap(),
    val isSubmitting: Boolean = false,
    val isLoadingHosts: Boolean = false,
    val errorMessage: String? = null,
    val submittedVisitId: String? = null,
)

@HiltViewModel
class ManualCheckInViewModel @Inject constructor(
    private val checkInRepository: CheckInRepository,
    private val credentialStore: CredentialStore,
    private val apiServiceProvider: ApiServiceProvider,
    draftClearance: ProtectedDraftClearanceService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ManualCheckInUiState())
    val uiState: StateFlow<ManualCheckInUiState> = _uiState.asStateFlow()

    init {
        draftClearance.registerDraftResetHandler { resetForm() }
        loadHosts()
        loadEffectiveForm(VisitorType.GENERAL.code)
    }

    fun resetForm() {
        _uiState.value = ManualCheckInUiState()
        loadHosts()
        loadEffectiveForm(VisitorType.GENERAL.code)
    }

    fun onVisitorNameChange(value: String) {
        _uiState.value = _uiState.value.copy(visitorName = value, errorMessage = null)
    }

    fun onVisitorPhoneChange(value: String) {
        _uiState.value = _uiState.value.copy(visitorPhone = value, errorMessage = null)
    }

    fun onHostIdChange(value: String) {
        _uiState.value = _uiState.value.copy(hostId = value, errorMessage = null)
    }

    fun onHostSelected(hostId: String, displayName: String, department: String) {
        _uiState.value = _uiState.value.copy(
            hostId = hostId,
            hostDisplayName = displayName,
            hostDepartment = department,
            errorMessage = null,
        )
    }

    fun onVisitorTypeChange(value: VisitorType) {
        _uiState.value = _uiState.value.copy(visitorType = value)
        loadEffectiveForm(value.code)
    }

    fun onPurposeCategoryChange(value: PurposeCategory?) {
        _uiState.value = _uiState.value.copy(purposeCategory = value)
    }

    fun onExtraAnswerChange(fieldCode: String, value: String) {
        _uiState.value = _uiState.value.copy(
            extraAnswers = _uiState.value.extraAnswers + (fieldCode to value),
            errorMessage = null,
        )
    }

    fun setAssistedChannel(assisted: Boolean) {
        _uiState.value = _uiState.value.copy(isAssistedChannel = assisted)
    }

    fun prefillInvitationId(invitationId: String) {
        _uiState.value = _uiState.value.copy(invitationId = invitationId)
    }

    fun prefillHostId(hostId: String) {
        val known = _uiState.value.hosts.find { it.id == hostId }
        if (known != null) {
            onHostSelected(known.id, known.displayName, known.department.orEmpty())
        } else {
            _uiState.value = _uiState.value.copy(hostId = hostId)
        }
    }

    fun submit() {
        val state = _uiState.value
        val siteId = credentialStore.siteId

        if (siteId.isNullOrBlank()) {
            _uiState.value = state.copy(errorMessage = "Kiosk is not provisioned with a site ID.")
            return
        }
        if (state.visitorName.isBlank() || state.hostId.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Visitor name and who they are visiting are required.")
            return
        }

        val form = state.effectiveForm
        val answerMap = buildMap {
            put("visitor_name", state.visitorName.trim())
            put("visitor_phone", state.visitorPhone.trim())
            put("host", state.hostDisplayName.ifBlank { state.hostId })
            putAll(state.extraAnswers)
        }
        val formAnswers = form?.fields?.map { field ->
            FormAnswerDraft(
                formVersionId = form.formVersionId,
                fieldCode = field.fieldCode,
                fieldLabelSnapshot = field.fieldLabel,
                value = answerMap[field.fieldCode].orEmpty(),
            )
        }.orEmpty()

        val draft = CheckInDraft(
            siteId = siteId,
            visitorName = state.visitorName.trim(),
            visitorPhone = state.visitorPhone.trim().ifBlank { null },
            hostId = state.hostId.trim(),
            visitorType = state.visitorType,
            purposeCategory = state.purposeCategory,
            invitationId = state.invitationId,
            captureChannel = when {
                state.invitationId != null -> CaptureChannel.QR
                state.isAssistedChannel -> CaptureChannel.ASSISTED
                else -> CaptureChannel.KIOSK
            },
            formAnswers = formAnswers,
        )

        _uiState.value = state.copy(isSubmitting = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = checkInRepository.submitCheckIn(draft)) {
                is CheckInSubmitResult.Success ->
                    _uiState.value = _uiState.value.copy(isSubmitting = false, submittedVisitId = result.visit.id)
                is CheckInSubmitResult.Failure ->
                    _uiState.value = _uiState.value.copy(isSubmitting = false, errorMessage = result.message)
            }
        }
    }

    private fun loadHosts() {
        val siteId = credentialStore.siteId
        _uiState.value = _uiState.value.copy(isLoadingHosts = true)
        viewModelScope.launch {
            try {
                val hosts = apiServiceProvider.get().listHosts(siteId)
                _uiState.value = _uiState.value.copy(hosts = hosts, isLoadingHosts = false)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(isLoadingHosts = false)
            }
        }
    }

    private fun loadEffectiveForm(visitorTypeCode: String) {
        val siteId = credentialStore.siteId
        viewModelScope.launch {
            try {
                val form = apiServiceProvider.get().effectiveCheckInForm(siteId, visitorTypeCode)
                _uiState.value = _uiState.value.copy(effectiveForm = form)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(effectiveForm = null)
            }
        }
    }
}
