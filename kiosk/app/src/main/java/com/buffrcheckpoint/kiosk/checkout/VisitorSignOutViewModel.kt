package com.buffrcheckpoint.kiosk.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.SignOutByPhoneRequest
import com.buffrcheckpoint.kiosk.core.network.dto.SurveyOptionDto
import com.buffrcheckpoint.kiosk.core.network.dto.SurveySubmitRequest
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
    /** Set after a successful sign-out when the optional rating can be offered. */
    val surveyToken: String? = null,
    val surveyOptions: List<SurveyOptionDto> = emptyList(),
    val surveySubmitting: Boolean = false,
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
                val api = apiServiceProvider.get()
                val result = api.signOutByPhone(
                    SignOutByPhoneRequest(siteId = siteId, visitorPhone = phone),
                )
                // Section 8.7: offer the optional one-tap rating after sign-out.
                // If the options cannot be loaded, skip the survey and finish.
                val options = result.surveyToken?.let {
                    runCatching { api.surveyOptions() }.getOrDefault(emptyList())
                } ?: emptyList()
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    successMessage = "Signed out${result.confirmationCode?.let { " · $it" } ?: ""}.",
                    surveyToken = if (options.isEmpty()) null else result.surveyToken,
                    surveyOptions = options,
                )
                if (options.isEmpty()) onDone()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = error.message ?: "Sign-out failed. See reception.",
                )
            }
        }
    }

    /** Records the rating; any failure still finishes, since the survey is optional. */
    fun submitRating(ratingCode: String, onDone: () -> Unit) {
        val token = _uiState.value.surveyToken ?: return onDone()
        _uiState.value = _uiState.value.copy(surveySubmitting = true)
        viewModelScope.launch {
            runCatching { apiServiceProvider.get().submitSurvey(SurveySubmitRequest(token = token, ratingCode = ratingCode)) }
            _uiState.value = _uiState.value.copy(surveySubmitting = false, surveyToken = null)
            onDone()
        }
    }
}
