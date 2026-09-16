package com.buffrcheckpoint.kiosk.session

import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.sync.OutboxRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Test

class ProtectedDraftClearanceServiceTest {

    @Test
    fun `clearAllDrafts invokes handlers and clears outbox plus visitor session`() {
        val experienceRepository = mockk<ExperienceRepository>()
        val outboxRepository = mockk<OutboxRepository>()
        every { experienceRepository.clearVisitorSession() } just runs
        coEvery { outboxRepository.clearPendingDrafts() } just runs

        val service = ProtectedDraftClearanceService(experienceRepository, outboxRepository)
        var handlerCalls = 0
        service.registerDraftResetHandler { handlerCalls += 1 }

        service.clearAllDrafts()

        assertEquals(1, handlerCalls)
        coVerify(exactly = 1) { outboxRepository.clearPendingDrafts() }
        verify(exactly = 1) { experienceRepository.clearVisitorSession() }
    }
}
