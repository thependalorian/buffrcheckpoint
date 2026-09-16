package com.buffrcheckpoint.kiosk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.buffrcheckpoint.kiosk.auth.AuthRepository
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.navigation.KioskNavGraph
import com.buffrcheckpoint.kiosk.session.AbandonVisitorCheckInUseCase
import com.buffrcheckpoint.kiosk.session.ProtectedDraftClearanceService
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * Single-activity kiosk. NFC reader-mode is enabled on the NFC check-in
 * screen via NfcAdapter.enableReaderMode (not here globally).
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var experienceRepository: ExperienceRepository

    @Inject
    lateinit var draftClearance: ProtectedDraftClearanceService

    @Inject
    lateinit var abandonCheckIn: AbandonVisitorCheckInUseCase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            Surface(modifier = Modifier.fillMaxSize()) {
                KioskNavGraph(
                    authRepository = authRepository,
                    experienceRepository = experienceRepository,
                    draftClearance = draftClearance,
                    abandonCheckIn = abandonCheckIn,
                )
            }
        }
    }
}
