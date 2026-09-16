package com.buffrcheckpoint.kiosk.nfc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.checkin.CheckInRepository
import com.buffrcheckpoint.kiosk.checkin.CheckInSubmitResult
import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.model.CaptureChannel
import com.buffrcheckpoint.kiosk.core.domain.model.VisitorType
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.OpenReaderSessionRequest
import com.buffrcheckpoint.kiosk.core.network.dto.ValidateCredentialRequest
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import com.buffrcheckpoint.kiosk.session.ProtectedDraftClearanceService
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface NfcUiState {
    data object Waiting : NfcUiState
    data object Validating : NfcUiState
    data object CheckingIn : NfcUiState
    data class Success(val visitId: String) : NfcUiState
    data class Error(val message: String) : NfcUiState
}

@HiltViewModel
class NfcCheckInViewModel @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    private val checkInRepository: CheckInRepository,
    private val credentialStore: CredentialStore,
    draftClearance: ProtectedDraftClearanceService,
) : ViewModel() {

    private val _uiState = MutableStateFlow<NfcUiState>(NfcUiState.Waiting)
    val uiState: StateFlow<NfcUiState> = _uiState.asStateFlow()

    init {
        draftClearance.registerDraftResetHandler { reset() }
    }

    fun onUnreadableTag() {
        if (_uiState.value !is NfcUiState.Waiting) return
        _uiState.value = NfcUiState.Error("Could not read a credential reference from this tag. Encode the server-issued HMAC as NDEF text.")
    }

    fun onReferenceRead(reference: String) {
        if (_uiState.value !is NfcUiState.Waiting && _uiState.value !is NfcUiState.Error) return
        viewModelScope.launch {
            _uiState.value = NfcUiState.Validating
            try {
                val api = apiServiceProvider.get()
                val siteId = credentialStore.siteId
                if (siteId.isNullOrBlank()) {
                    _uiState.value = NfcUiState.Error("Kiosk site is not configured.")
                    return@launch
                }
                val devices = api.listDevices().filter { it.siteId == siteId }
                val deviceId = devices.firstOrNull()?.id
                if (deviceId == null) {
                    _uiState.value = NfcUiState.Error("No enrolled device found for this site.")
                    return@launch
                }
                val session = api.openReaderSession(OpenReaderSessionRequest(deviceId = deviceId))
                val result = api.validateCredential(
                    ValidateCredentialRequest(
                        readerSessionReference = session.readerSessionReference,
                        credentialReference = reference.trim(),
                    ),
                )
                if (!result.valid) {
                    val message = when (result.reason) {
                        "revoked" -> "This credential has been revoked."
                        "expired" -> "This credential has expired."
                        "not_found" -> "Credential not recognised."
                        "invalid_reader_session" -> "Reader session expired. Try again."
                        "device_not_approved" -> "This kiosk device is not approved for deployment."
                        else -> "Credential is not valid."
                    }
                    _uiState.value = NfcUiState.Error(message)
                    return@launch
                }
                val holderId = result.holderId
                if (holderId.isNullOrBlank()) {
                    _uiState.value = NfcUiState.Error("Credential has no holder binding.")
                    return@launch
                }
                val hosts = api.listHosts(siteId).filter { it.active }
                val hostId = hosts.firstOrNull()?.id
                if (hostId == null) {
                    _uiState.value = NfcUiState.Error("No active host configured for this site.")
                    return@launch
                }
                val visitorType = when (result.holderTypeCode) {
                    "contractor" -> VisitorType.CONTRACTOR
                    "staff" -> VisitorType.TEMPORARY_STAFF
                    else -> VisitorType.GENERAL
                }
                _uiState.value = NfcUiState.CheckingIn
                val draft = CheckInDraft(
                    siteId = siteId,
                    visitorId = if (result.holderTypeCode == "visitor") holderId else null,
                    visitorName = null,
                    hostId = hostId,
                    visitorType = visitorType,
                    captureChannel = CaptureChannel.NFC_BADGE,
                )
                when (val submit = checkInRepository.submitCheckIn(draft)) {
                    is CheckInSubmitResult.Success -> _uiState.value = NfcUiState.Success(submit.visit.id)
                    is CheckInSubmitResult.Failure -> _uiState.value = NfcUiState.Error(submit.message)
                }
            } catch (e: retrofit2.HttpException) {
                _uiState.value = NfcUiState.Error("Validation failed (HTTP ${e.code()}).")
            } catch (e: java.io.IOException) {
                _uiState.value = NfcUiState.Error("No connection — NFC check-in requires online validation.")
            } catch (e: Exception) {
                _uiState.value = NfcUiState.Error(e.message ?: "NFC check-in failed.")
            }
        }
    }

    fun reset() {
        _uiState.value = NfcUiState.Waiting
    }
}
