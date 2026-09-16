package com.buffrcheckpoint.kiosk.checkin

import android.content.Context
import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.Visit
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.sync.OutboxDrainWorker
import com.buffrcheckpoint.kiosk.sync.OutboxRepository
import com.buffrcheckpoint.kiosk.sync.toOfflineVisitPlaceholder
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

sealed interface CheckInSubmitResult {
    data class Success(val visit: Visit) : CheckInSubmitResult
    data class Failure(val message: String) : CheckInSubmitResult
}

/**
 * Offline-first: local outbox is source of truth while partitioned. The draft
 * idempotency id is never regenerated on retry.
 */
@Singleton
class CheckInRepository @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    private val outboxRepository: OutboxRepository,
    @ApplicationContext private val appContext: Context,
) {
    suspend fun submitCheckIn(draft: CheckInDraft): CheckInSubmitResult {
        val request = draft.toRequest().copy(offlineCaptured = draft.offlineCaptured)
        return try {
            val response = apiServiceProvider.get().checkIn(request)
            CheckInSubmitResult.Success(response.toDomain())
        } catch (e: retrofit2.HttpException) {
            val message = when (e.code()) {
                400 -> "Check-in details were rejected — check host and visitor type are valid for this site."
                403 -> "This kiosk account isn't allowed to record arrivals."
                else -> "Check-in failed (HTTP ${e.code()})."
            }
            CheckInSubmitResult.Failure(message)
        } catch (e: java.io.IOException) {
            val offlineDraft = draft.copy(offlineCaptured = true)
            outboxRepository.enqueueCheckIn(offlineDraft.toRequest().copy(offlineCaptured = true))
            OutboxDrainWorker.enqueue(appContext)
            CheckInSubmitResult.Success(offlineDraft.toOfflineVisitPlaceholder())
        }
    }

    suspend fun checkOut(visitId: String): CheckInSubmitResult {
        return try {
            val response = apiServiceProvider.get().checkOut(visitId)
            CheckInSubmitResult.Success(response.toDomain())
        } catch (e: retrofit2.HttpException) {
            CheckInSubmitResult.Failure("Check-out failed (HTTP ${e.code()}).")
        } catch (e: java.io.IOException) {
            outboxRepository.enqueueCheckOut(visitId)
            OutboxDrainWorker.enqueue(appContext)
            CheckInSubmitResult.Success(
                Visit(
                    id = visitId,
                    organisationId = "",
                    siteId = "",
                    zoneId = null,
                    visitorId = null,
                    hostId = "",
                    checkedInAt = null,
                    serverAcceptedAt = null,
                    checkedOutAt = java.time.Instant.now(),
                    offlineCaptured = true,
                ),
            )
        }
    }
}
