package com.buffrcheckpoint.kiosk.welcome

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.experience.CapabilityRepository
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.experience.KioskCapabilityFlags
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class WelcomeUiState(
    val isLoading: Boolean = true,
    val experience: KioskExperienceState = KioskExperienceState(),
    val capabilities: KioskCapabilityFlags = KioskCapabilityFlags(),
    val errorMessage: String? = null,
)

@HiltViewModel
class WelcomeViewModel @Inject constructor(
    private val experienceRepository: ExperienceRepository,
    private val capabilityRepository: CapabilityRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(WelcomeUiState())
    val uiState: StateFlow<WelcomeUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            runCatching {
                val experience = experienceRepository.syncFromBackend()
                val capabilities = capabilityRepository.refresh()
                WelcomeUiState(isLoading = false, experience = experience, capabilities = capabilities)
            }.onSuccess { loaded ->
                _uiState.value = loaded
            }.onFailure { error ->
                _uiState.value = WelcomeUiState(
                    isLoading = false,
                    experience = experienceRepository.loadCached(),
                    capabilities = capabilityRepository.current(),
                    errorMessage = error.message,
                )
            }
        }
    }

    fun selectLanguage(code: String) {
        experienceRepository.setSelectedLanguage(code)
        _uiState.value = _uiState.value.copy(experience = experienceRepository.loadCached())
    }

    fun isChannelEnabled(code: String): Boolean {
        val enabled = _uiState.value.experience.enabledChannelCodes
        return enabled.isEmpty() || enabled.contains(code)
    }

    fun isNfcEnabled(): Boolean =
        isChannelEnabled("nfc_badge") && _uiState.value.capabilities.nfcBadgeLive

    fun isUssdEnabled(): Boolean =
        isChannelEnabled("ussd") && _uiState.value.capabilities.ussdLive

    /** National e-ID must stay absent (not a disabled tile) until platform status is live. */
    fun isNationalEidEnabled(): Boolean =
        _uiState.value.capabilities.nationalEidLive

    fun isQrInvitationEnabled(): Boolean =
        isChannelEnabled("qr") && _uiState.value.capabilities.qrInvitationLive
}
