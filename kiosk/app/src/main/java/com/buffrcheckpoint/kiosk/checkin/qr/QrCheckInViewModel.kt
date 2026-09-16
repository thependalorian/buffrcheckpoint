package com.buffrcheckpoint.kiosk.checkin.qr

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.session.ProtectedDraftClearanceService
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class QrCheckInUiState(
    val scannedInvitationId: String? = null,
    val resolvedHostId: String? = null,
    val errorMessage: String? = null,
    val isResolving: Boolean = false,
)

@HiltViewModel
class QrCheckInViewModel @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    draftClearance: ProtectedDraftClearanceService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(QrCheckInUiState())
    val uiState: StateFlow<QrCheckInUiState> = _uiState.asStateFlow()

    init {
        draftClearance.registerDraftResetHandler { reset() }
    }

    fun onQrScanned(rawValue: String) {
        if (_uiState.value.scannedInvitationId != null || _uiState.value.isResolving) return
        viewModelScope.launch {
            _uiState.value = QrCheckInUiState(isResolving = true)
            val token = extractInvitationToken(rawValue.trim())
            if (token == null) {
                _uiState.value = QrCheckInUiState(errorMessage = "Invalid invitation QR.")
                return@launch
            }
            try {
                val resolved = apiServiceProvider.get().resolveInvitationToken(token)
                _uiState.value = QrCheckInUiState(
                    scannedInvitationId = resolved.invitationId,
                    resolvedHostId = resolved.hostId,
                )
            } catch (_: Exception) {
                _uiState.value = QrCheckInUiState(errorMessage = "Invitation not found or no longer valid.")
            }
        }
    }

    private fun extractInvitationToken(raw: String): String? {
        return when {
            raw.contains("inv=") -> raw.substringAfter("inv=").substringBefore("&").trim()
            raw.length >= 16 -> raw
            else -> null
        }
    }

    fun reset() {
        _uiState.value = QrCheckInUiState()
    }
}
