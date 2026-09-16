package com.buffrcheckpoint.kiosk.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.SignOutByPhoneRequest
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VisitorSignOutUiState(
    val visitorPhone: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class VisitorSignOutViewModel @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    private val credentialStore: CredentialStore,
) : ViewModel() {
    private val _uiState = MutableStateFlow(VisitorSignOutUiState())
    val uiState: StateFlow<VisitorSignOutUiState> = _uiState.asStateFlow()

    fun onPhoneChange(value: String) {
        _uiState.value = _uiState.value.copy(visitorPhone = value, errorMessage = null, successMessage = null)
    }

    fun signOut(onDone: () -> Unit) {
        val siteId = credentialStore.siteId
        val phone = _uiState.value.visitorPhone.trim()
        if (siteId.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Kiosk is not provisioned with a site ID.")
            return
        }
        if (phone.length < 7) {
            _uiState.value = _uiState.value.copy(errorMessage = "Enter the mobile number used at check-in.")
            return
        }
        _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
        viewModelScope.launch {
            try {
                val result = apiServiceProvider.get().signOutByPhone(
                    SignOutByPhoneRequest(siteId = siteId, visitorPhone = phone),
                )
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    successMessage = "Signed out${result.confirmationCode?.let { " · $it" } ?: ""}.",
                )
                onDone()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = error.message ?: "Sign-out failed. See reception.",
                )
            }
        }
    }
}
