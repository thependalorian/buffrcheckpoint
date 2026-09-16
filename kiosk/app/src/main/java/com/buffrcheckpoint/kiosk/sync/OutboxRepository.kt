package com.buffrcheckpoint.kiosk.sync

import com.buffrcheckpoint.kiosk.core.db.OutboxDao
import com.buffrcheckpoint.kiosk.core.db.OutboxEntity
import com.buffrcheckpoint.kiosk.core.db.OutboxStatus
import com.buffrcheckpoint.kiosk.core.db.OutboxType
import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.Visit
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.CheckInRequest
import com.buffrcheckpoint.kiosk.core.network.dto.PreCheckinAcknowledgePolicyRequest
import com.squareup.moshi.Moshi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

enum class SyncBannerState {
    IDLE,
    QUEUED,
    SYNCING,
    FAILED,
    SYNCED,
}

data class SyncUiState(
    val banner: SyncBannerState = SyncBannerState.IDLE,
    val openCount: Int = 0,
    val lastError: String? = null,
)

@Singleton
class OutboxRepository @Inject constructor(
    private val outboxDao: OutboxDao,
    private val apiServiceProvider: ApiServiceProvider,
    moshi: Moshi,
) {
    private val checkInAdapter = moshi.adapter(CheckInRequest::class.java)
    private val privacyAdapter = moshi.adapter(PreCheckinAcknowledgePolicyRequest::class.java)

    fun observeSyncUi(): Flow<SyncUiState> = outboxDao.observeOpen().map { open ->
        when {
            open.isEmpty() -> SyncUiState(SyncBannerState.IDLE, 0, null)
            open.any { it.status == OutboxStatus.FAILED } -> SyncUiState(
                SyncBannerState.FAILED,
                open.size,
                open.firstOrNull { it.status == OutboxStatus.FAILED }?.lastError,
            )
            open.any { it.status == OutboxStatus.SYNCING } -> SyncUiState(SyncBannerState.SYNCING, open.size, null)
            else -> SyncUiState(SyncBannerState.QUEUED, open.size, null)
        }
    }

    suspend fun enqueueCheckIn(request: CheckInRequest) {
        val now = System.currentTimeMillis()
        outboxDao.insert(
            OutboxEntity(
                id = UUID.randomUUID().toString(),
                type = OutboxType.CHECK_IN,
                clientVisitId = request.id,
                payloadJson = checkInAdapter.toJson(request),
                status = OutboxStatus.PENDING,
                createdAtEpochMs = now,
                updatedAtEpochMs = now,
            ),
        )
    }

    suspend fun enqueueCheckOut(visitId: String) {
        val now = System.currentTimeMillis()
        outboxDao.insert(
            OutboxEntity(
                id = UUID.randomUUID().toString(),
                type = OutboxType.CHECK_OUT,
                clientVisitId = visitId,
                payloadJson = """{"visitId":"$visitId"}""",
                status = OutboxStatus.PENDING,
                createdAtEpochMs = now,
                updatedAtEpochMs = now,
            ),
        )
    }

    suspend fun enqueuePrivacyPreAck(request: PreCheckinAcknowledgePolicyRequest) {
        val now = System.currentTimeMillis()
        outboxDao.insert(
            OutboxEntity(
                id = UUID.randomUUID().toString(),
                type = OutboxType.PRIVACY_PRE_ACK,
                clientVisitId = request.kioskSessionId,
                payloadJson = privacyAdapter.toJson(request),
                status = OutboxStatus.PENDING,
                createdAtEpochMs = now,
                updatedAtEpochMs = now,
            ),
        )
    }

    /**
     * Drain until empty. Returns false if a durable failure remains so WorkManager can retry.
     */
    suspend fun clearPendingDrafts() {
        outboxDao.deletePendingDrafts()
    }

    suspend fun drainUntilEmpty(): Boolean {
        while (true) {
            val next = outboxDao.nextPending() ?: return true
            val now = System.currentTimeMillis()
            outboxDao.updateStatus(next.id, OutboxStatus.SYNCING, next.attemptCount + 1, null, now)
            try {
                when (next.type) {
                    OutboxType.CHECK_IN -> {
                        val body = checkInAdapter.fromJson(next.payloadJson)
                            ?: error("Corrupt check-in outbox payload")
                        apiServiceProvider.get().checkIn(body)
                    }
                    OutboxType.CHECK_OUT -> {
                        apiServiceProvider.get().checkOut(next.clientVisitId)
                    }
                    OutboxType.PRIVACY_PRE_ACK -> {
                        val body = privacyAdapter.fromJson(next.payloadJson)
                            ?: error("Corrupt privacy outbox payload")
                        apiServiceProvider.get().acknowledgePolicyPreCheckin(body)
                    }
                    else -> error("Unknown outbox type ${next.type}")
                }
                outboxDao.updateStatus(
                    next.id,
                    OutboxStatus.SYNCED,
                    next.attemptCount + 1,
                    null,
                    System.currentTimeMillis(),
                )
            } catch (e: retrofit2.HttpException) {
                // 4xx on duplicate idempotency can be treated as synced
                if (e.code() in 400..499 && next.type == OutboxType.CHECK_IN && e.code() != 401 && e.code() != 403) {
                    // Keep failed for operator visibility except conflicts that mean already accepted
                    if (e.code() == 409) {
                        outboxDao.updateStatus(next.id, OutboxStatus.SYNCED, next.attemptCount + 1, null, System.currentTimeMillis())
                        continue
                    }
                }
                outboxDao.updateStatus(
                    next.id,
                    OutboxStatus.FAILED,
                    next.attemptCount + 1,
                    "HTTP ${e.code()}: ${e.message()}",
                    System.currentTimeMillis(),
                )
                return false
            } catch (e: Exception) {
                outboxDao.updateStatus(
                    next.id,
                    OutboxStatus.FAILED,
                    next.attemptCount + 1,
                    e.message ?: e.javaClass.simpleName,
                    System.currentTimeMillis(),
                )
                return false
            }
        }
    }
}

fun CheckInDraft.toOfflineVisitPlaceholder(): Visit = Visit(
    id = id,
    organisationId = "",
    siteId = siteId,
    zoneId = zoneId,
    visitorId = visitorId,
    hostId = hostId,
    checkedInAt = capturedAt,
    serverAcceptedAt = null,
    checkedOutAt = null,
    offlineCaptured = true,
)
