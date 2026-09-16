package com.buffrcheckpoint.kiosk.session

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AbandonVisitorCheckInUseCase @Inject constructor(
    private val draftClearance: ProtectedDraftClearanceService,
) {
    fun execute(onNavigateHome: () -> Unit) {
        draftClearance.clearAllDrafts()
        onNavigateHome()
    }
}
