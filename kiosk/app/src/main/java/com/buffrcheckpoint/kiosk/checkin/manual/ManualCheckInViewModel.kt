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
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState
import com.buffrcheckpoint.kiosk.session.ProtectedDraftClearanceService
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Field codes that are first-class on CheckInDto / visitor_personal_data and
 * mirrored on the public `/check-in` form (seed 0016_demo_check_in_form.sql).
 * Anything else from the effective form version is collected as an extra answer.
 */
object CheckInFormFieldCodes {
    const val VISITOR_NAME = "visitor_name"
    const val VISITOR_PHONE = "visitor_phone"
    const val COMPANY_NAME = "company_name"
    const val VISITOR_EMAIL = "visitor_email"
    const val ID_DOCUMENT_NUMBER = "id_document_number"
    const val VEHICLE_REGISTRATION = "vehicle_registration"
    const val HOST = "host"
    const val PURPOSE_CATEGORY = "purpose_category"
    const val VISITOR_TYPE = "visitor_type"
    const val VISITOR_CATEGORY = "visitor_category"

    val CORE = setOf(
        VISITOR_NAME,
        VISITOR_PHONE,
        COMPANY_NAME,
        VISITOR_EMAIL,
        ID_DOCUMENT_NUMBER,
        VEHICLE_REGISTRATION,
        HOST,
        PURPOSE_CATEGORY,
        VISITOR_TYPE,
        VISITOR_CATEGORY,
    )
}

data class ManualCheckInUiState(
    val visitorName: String = "",
    val visitorPhone: String = "",
    val companyName: String = "",
    val visitorEmail: String = "",
    val idDocumentNumber: String = "",
    val vehicleRegistration: String = "",
    val hostId: String = "",
    val hostDisplayName: String = "",
    val hostDepartment: String = "",
    val visitorType: VisitorType = VisitorType.GENERAL,
    val purposeCategory: PurposeCategory? = PurposeCategory.BUSINESS,
    val invitationId: String? = null,
    val isAssistedChannel: Boolean = false,
    val hosts: List<HostRowDto> = emptyList(),
    val effectiveForm: EffectiveCheckInFormDto? = null,
    val extraAnswers: Map<String, String> = emptyMap(),
    val isSubmitting: Boolean = false,
    val isLoadingHosts: Boolean = false,
    val isLoadingForm: Boolean = false,
    val errorMessage: String? = null,
    val submittedVisitId: String? = null,
) {
    fun fieldRequired(fieldCode: String, defaultRequired: Boolean): Boolean {
        val formField = effectiveForm?.fields?.find { it.fieldCode == fieldCode } ?: return defaultRequired
        val answers = buildAnswerMap()
        if (!FormRules.isFieldVisible(formField.visibilityRule, answers)) return false
        return FormRules.isFieldRequired(formField.required, formField.validationSchema, answers)
    }

    fun fieldVisible(fieldCode: String): Boolean {
        val formField = effectiveForm?.fields?.find { it.fieldCode == fieldCode } ?: return true
        return FormRules.isFieldVisible(formField.visibilityRule, buildAnswerMap())
    }

    private fun buildAnswerMap(): Map<String, String> = buildMap {
        put(CheckInFormFieldCodes.VISITOR_NAME, visitorName.trim())
        put(CheckInFormFieldCodes.VISITOR_PHONE, visitorPhone.trim())
        put(CheckInFormFieldCodes.COMPANY_NAME, companyName.trim())
        put(CheckInFormFieldCodes.VISITOR_EMAIL, visitorEmail.trim())
        put(CheckInFormFieldCodes.ID_DOCUMENT_NUMBER, idDocumentNumber.trim())
        put(CheckInFormFieldCodes.VEHICLE_REGISTRATION, vehicleRegistration.trim())
        put(CheckInFormFieldCodes.HOST, hostDisplayName.ifBlank { hostId })
        put(CheckInFormFieldCodes.PURPOSE_CATEGORY, purposeCategory?.code.orEmpty())
        put(CheckInFormFieldCodes.VISITOR_TYPE, visitorType.code)
        putAll(extraAnswers)
    }
}

@HiltViewModel
class ManualCheckInViewModel @Inject constructor(
    private val checkInRepository: CheckInRepository,
    private val credentialStore: CredentialStore,
    private val apiServiceProvider: ApiServiceProvider,
    private val experienceRepository: ExperienceRepository,
    draftClearance: ProtectedDraftClearanceService,
) : ViewModel() {

    val experience: KioskExperienceState
        get() = experienceRepository.loadCached()

    private val _uiState = MutableStateFlow(ManualCheckInUiState())
    val uiState: StateFlow<ManualCheckInUiState> = _uiState.asStateFlow()

    init {
        draftClearance.registerDraftResetHandler { resetForm() }
        loadHosts()
        loadEffectiveForm(VisitorType.GENERAL.code)
    }

    fun resetForm() {
        val assisted = _uiState.value.isAssistedChannel
        _uiState.value = ManualCheckInUiState(isAssistedChannel = assisted)
        loadHosts()
        loadEffectiveForm(VisitorType.GENERAL.code)
    }

    fun onVisitorNameChange(value: String) {
        _uiState.value = _uiState.value.copy(visitorName = value, errorMessage = null)
    }

    fun onVisitorPhoneChange(value: String) {
        _uiState.value = _uiState.value.copy(visitorPhone = value, errorMessage = null)
    }

    fun onCompanyNameChange(value: String) {
        _uiState.value = _uiState.value.copy(companyName = value, errorMessage = null)
    }

    fun onVisitorEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(visitorEmail = value, errorMessage = null)
    }

    fun onIdDocumentNumberChange(value: String) {
        _uiState.value = _uiState.value.copy(idDocumentNumber = value, errorMessage = null)
    }

    fun onVehicleRegistrationChange(value: String) {
        _uiState.value = _uiState.value.copy(vehicleRegistration = value, errorMessage = null)
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
        _uiState.value = _uiState.value.copy(visitorType = value, errorMessage = null)
        loadEffectiveForm(value.code)
    }

    fun onPurposeCategoryChange(value: PurposeCategory?) {
        _uiState.value = _uiState.value.copy(purposeCategory = value, errorMessage = null)
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

        val validationError = validate(state)
        if (validationError != null) {
            _uiState.value = state.copy(errorMessage = validationError)
            return
        }

        val phone = state.visitorPhone.trim()
        val company = state.companyName.trim()
        val email = state.visitorEmail.trim().ifBlank { null }
        val idDoc = state.idDocumentNumber.trim().ifBlank { null }
        val vehicle = state.vehicleRegistration.trim().ifBlank { null }
        val purposeCode = state.purposeCategory?.code.orEmpty()

        val answerMap = buildMap {
            put(CheckInFormFieldCodes.VISITOR_NAME, state.visitorName.trim())
            put(CheckInFormFieldCodes.VISITOR_PHONE, phone)
            put(CheckInFormFieldCodes.COMPANY_NAME, company)
            put(CheckInFormFieldCodes.VISITOR_EMAIL, email.orEmpty())
            put(CheckInFormFieldCodes.ID_DOCUMENT_NUMBER, idDoc.orEmpty())
            put(CheckInFormFieldCodes.VEHICLE_REGISTRATION, vehicle.orEmpty())
            put(CheckInFormFieldCodes.HOST, state.hostDisplayName.ifBlank { state.hostId })
            put(CheckInFormFieldCodes.PURPOSE_CATEGORY, purposeCode)
            put(CheckInFormFieldCodes.VISITOR_TYPE, state.visitorType.code)
            putAll(state.extraAnswers)
        }

        val form = state.effectiveForm
        val formAnswers = form?.fields
            ?.filter { FormRules.isFieldVisible(it.visibilityRule, answerMap) }
            ?.map { field ->
                FormAnswerDraft(
                    formVersionId = form.formVersionId,
                    fieldCode = field.fieldCode,
                    fieldLabelSnapshot = field.fieldLabel,
                    value = answerMap[field.fieldCode].orEmpty(),
                )
            }
            .orEmpty()

        val draft = CheckInDraft(
            siteId = siteId,
            visitorName = state.visitorName.trim(),
            visitorPhone = phone,
            companyName = company,
            visitorEmail = email,
            vehicleRegistration = vehicle,
            idDocumentNumber = idDoc,
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

    private fun validate(state: ManualCheckInUiState): String? {
        if (state.visitorName.isBlank()) return "Visitor name is required."
        if (state.hostId.isBlank()) return "Choose who the visitor is meeting."

        val answerMap = buildMap {
            put(CheckInFormFieldCodes.VISITOR_NAME, state.visitorName.trim())
            put(CheckInFormFieldCodes.VISITOR_PHONE, state.visitorPhone.trim())
            put(CheckInFormFieldCodes.COMPANY_NAME, state.companyName.trim())
            put(CheckInFormFieldCodes.VISITOR_EMAIL, state.visitorEmail.trim())
            put(CheckInFormFieldCodes.ID_DOCUMENT_NUMBER, state.idDocumentNumber.trim())
            put(CheckInFormFieldCodes.VEHICLE_REGISTRATION, state.vehicleRegistration.trim())
            put(CheckInFormFieldCodes.HOST, state.hostDisplayName.ifBlank { state.hostId })
            put(CheckInFormFieldCodes.PURPOSE_CATEGORY, state.purposeCategory?.code.orEmpty())
            put(CheckInFormFieldCodes.VISITOR_TYPE, state.visitorType.code)
            putAll(state.extraAnswers)
        }

        val phoneRequired = state.fieldRequired(CheckInFormFieldCodes.VISITOR_PHONE, defaultRequired = true)
        val phone = state.visitorPhone.trim()
        if (phoneRequired && phone.length < 7) {
            return "Mobile number is required (at least 7 digits)."
        }

        val companyRequired = state.fieldRequired(CheckInFormFieldCodes.COMPANY_NAME, defaultRequired = true)
        if (companyRequired && state.companyName.isBlank()) {
            return "Organisation / company is required."
        }

        val purposeRequired = state.fieldRequired(CheckInFormFieldCodes.PURPOSE_CATEGORY, defaultRequired = false)
        if (purposeRequired && state.purposeCategory == null) {
            return "Purpose of visit is required."
        }

        state.effectiveForm?.fields
            ?.filter { FormRules.isFieldVisible(it.visibilityRule, answerMap) }
            ?.forEach { field ->
                val required = FormRules.isFieldRequired(field.required, field.validationSchema, answerMap)
                if (!required) return@forEach
                val value = when (field.fieldCode) {
                    CheckInFormFieldCodes.VISITOR_NAME -> state.visitorName
                    CheckInFormFieldCodes.VISITOR_PHONE -> state.visitorPhone
                    CheckInFormFieldCodes.COMPANY_NAME -> state.companyName
                    CheckInFormFieldCodes.VISITOR_EMAIL -> state.visitorEmail
                    CheckInFormFieldCodes.ID_DOCUMENT_NUMBER -> state.idDocumentNumber
                    CheckInFormFieldCodes.VEHICLE_REGISTRATION -> state.vehicleRegistration
                    CheckInFormFieldCodes.HOST -> state.hostId
                    CheckInFormFieldCodes.PURPOSE_CATEGORY -> state.purposeCategory?.code.orEmpty()
                    else -> state.extraAnswers[field.fieldCode].orEmpty()
                }
                if (value.isBlank()) {
                    return "${field.fieldLabel} is required."
                }
            }

        return null
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
        _uiState.value = _uiState.value.copy(isLoadingForm = true)
        viewModelScope.launch {
            try {
                val form = apiServiceProvider.get().effectiveCheckInForm(siteId, visitorTypeCode)
                _uiState.value = _uiState.value.copy(effectiveForm = form, isLoadingForm = false)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(effectiveForm = null, isLoadingForm = false)
            }
        }
    }
}
