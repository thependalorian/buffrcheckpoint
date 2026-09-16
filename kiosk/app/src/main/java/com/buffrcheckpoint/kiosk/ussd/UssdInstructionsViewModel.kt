package com.buffrcheckpoint.kiosk.ussd

import androidx.lifecycle.ViewModel
import com.buffrcheckpoint.kiosk.experience.CapabilityRepository
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

data class UssdInstructionsUiState(
    val ussdShortCode: String = "*123#",
    val helpContactReference: String? = null,
    val ussdCapabilityLive: Boolean = false,
)

@HiltViewModel
class UssdInstructionsViewModel @Inject constructor(
    experienceRepository: ExperienceRepository,
    capabilityRepository: CapabilityRepository,
) : ViewModel() {
    private val experience = experienceRepository.loadCached()

    val uiState = UssdInstructionsUiState(
        helpContactReference = experience.helpContactReference,
        ussdCapabilityLive = capabilityRepository.current().ussdLive,
    )
}
