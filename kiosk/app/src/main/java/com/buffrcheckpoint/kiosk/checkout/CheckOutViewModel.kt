package com.buffrcheckpoint.kiosk.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.checkin.CheckInRepository
import com.buffrcheckpoint.kiosk.checkin.CheckInSubmitResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CheckOutUiState(
    val inFlightVisitId: String? = null,
    val errorMessage: String? = null,
    val lastCheckedOutVisitId: String? = null,
    val lastCheckedOutVisitorName: String? = null,
)

/**
 * Checkout is idempotent server-side (POST /visits/:id/check-out is a
 * no-op if already checked out) — a double-tap on the roster is safe to
 * resubmit rather than needing client-side debouncing beyond disabling the
 * tapped row while in flight.
 */
@HiltViewModel
class CheckOutViewModel @Inject constructor(
    private val checkInRepository: CheckInRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CheckOutUiState())
    val uiState: StateFlow<CheckOutUiState> = _uiState.asStateFlow()

    fun checkOut(visitId: String, visitorDisplayName: String = "", onDone: () -> Unit) {
        if (_uiState.value.inFlightVisitId == visitId) return
        _uiState.value = _uiState.value.copy(inFlightVisitId = visitId, errorMessage = null)
        viewModelScope.launch {
            when (val result = checkInRepository.checkOut(visitId)) {
                is CheckInSubmitResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        inFlightVisitId = null,
                        lastCheckedOutVisitId = visitId,
                        lastCheckedOutVisitorName = visitorDisplayName.ifBlank { null },
                    )
                    onDone()
                }
                is CheckInSubmitResult.Failure ->
                    _uiState.value = _uiState.value.copy(inFlightVisitId = null, errorMessage = result.message)
            }
        }
    }

    fun clearCheckoutConfirmation() {
        _uiState.value = _uiState.value.copy(lastCheckedOutVisitId = null, lastCheckedOutVisitorName = null)
    }
}
