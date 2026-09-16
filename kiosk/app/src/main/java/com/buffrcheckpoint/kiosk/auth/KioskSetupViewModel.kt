package com.buffrcheckpoint.kiosk.auth

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class KioskSetupUiState(
    val baseUrl: String = "",
    val siteId: String = "",
    val errorMessage: String? = null,
    val provisioned: Boolean = false,
)

@HiltViewModel
class KioskSetupViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        authRepository.savedSiteConfiguration()?.let { (baseUrl, siteId) ->
            KioskSetupUiState(baseUrl = baseUrl, siteId = siteId)
        } ?: KioskSetupUiState(),
    )
    val uiState: StateFlow<KioskSetupUiState> = _uiState.asStateFlow()

    fun onBaseUrlChange(value: String) {
        _uiState.value = _uiState.value.copy(baseUrl = value, errorMessage = null)
    }

    fun onSiteIdChange(value: String) {
        _uiState.value = _uiState.value.copy(siteId = value, errorMessage = null)
    }

    fun save() {
        val state = _uiState.value
        if (state.baseUrl.isBlank() || state.siteId.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Enter both the backend base URL and this kiosk's site ID.")
            return
        }
        authRepository.provision(state.baseUrl.trim(), state.siteId.trim())
        _uiState.value = state.copy(provisioned = true)
    }
}
