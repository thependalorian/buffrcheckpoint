package com.buffrcheckpoint.kiosk.checkin.ui

import androidx.lifecycle.ViewModel
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class CheckInSuccessViewModel @Inject constructor(
    val experienceRepository: ExperienceRepository,
) : ViewModel()
