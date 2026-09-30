package com.buffrcheckpoint.kiosk.privacy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.experience.KioskExperienceState
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PrivacyNoticeUiState(
    val experience: KioskExperienceState = KioskExperienceState(),
    val policyTitle: String = "Visitor privacy notice",
    val policyBody: String = "Please read this notice before entering personal details.",
    val canAccept: Boolean = true,
)

@HiltViewModel
class PrivacyNoticeViewModel @Inject constructor(
    private val experienceRepository: ExperienceRepository,
) : ViewModel() {
    private val experience = experienceRepository.loadCached()

    private val _uiState = MutableStateFlow(
        PrivacyNoticeUiState(
            experience = experience,
            policyTitle = experience.privacyPolicyName ?: "Visitor privacy notice",
            policyBody = experience.privacyPolicyText
                ?: "This site processes visitor personal data for access control and host notification. Contact reception if you have questions about how your data is used or retained.",
            canAccept = true,
        ),
    )
    val uiState: StateFlow<PrivacyNoticeUiState> = _uiState.asStateFlow()

    fun accept(captureChannelCode: String, onReady: () -> Unit) {
        val versionId = experience.privacyNoticeVersionId ?: run {
            onReady()
            return
        }
        experienceRepository.markPrivacyDisplayed(versionId)
        viewModelScope.launch {
            experienceRepository.acknowledgePreCheckinPolicy(captureChannelCode)
            onReady()
        }
    }
}
