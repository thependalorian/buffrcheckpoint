package com.buffrcheckpoint.kiosk.session

import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import com.buffrcheckpoint.kiosk.sync.OutboxRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.runBlocking

@Singleton
class ProtectedDraftClearanceService @Inject constructor(
    private val experienceRepository: ExperienceRepository,
    private val outboxRepository: OutboxRepository,
) {
    private val draftResetHandlers = mutableListOf<() -> Unit>()

    fun registerDraftResetHandler(handler: () -> Unit) {
        draftResetHandlers.add(handler)
    }

    fun clearAllDrafts() {
        draftResetHandlers.forEach { runCatching(it) }
        runBlocking { outboxRepository.clearPendingDrafts() }
        experienceRepository.clearVisitorSession()
    }
}
