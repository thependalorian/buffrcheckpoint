package com.buffrcheckpoint.kiosk.session

import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import org.junit.Assert.assertTrue
import org.junit.Test

class AbandonVisitorCheckInUseCaseTest {

    @Test
    fun `execute clears drafts then navigates home`() {
        val draftClearance = mockk<ProtectedDraftClearanceService>()
        every { draftClearance.clearAllDrafts() } just runs

        val useCase = AbandonVisitorCheckInUseCase(draftClearance)
        var navigatedHome = false

        useCase.execute { navigatedHome = true }

        verify(exactly = 1) { draftClearance.clearAllDrafts() }
        assertTrue(navigatedHome)
    }
}
