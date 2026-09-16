package com.buffrcheckpoint.kiosk.core.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "outbox_events")
data class OutboxEntity(
    @PrimaryKey val id: String,
    /** check_in | check_out | privacy_pre_ack */
    val type: String,
    /** Stable client visit/idempotency id — never regenerated on retry. */
    val clientVisitId: String,
    val payloadJson: String,
    val status: String,
    val attemptCount: Int = 0,
    val lastError: String? = null,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
)

@Entity(tableName = "roster_cache")
data class RosterCacheEntity(
    @PrimaryKey val visitId: String,
    val siteId: String,
    val visitorDisplayName: String,
    val visitorTypeCode: String,
    val hostDisplayName: String,
    val assuranceLevelCode: String?,
    val visitStatusCode: String,
    val checkedInAt: String?,
    val checkedOutAt: String?,
    val offlineCaptured: Boolean,
    val requiresAction: Boolean,
    val cachedAtEpochMs: Long,
)

object OutboxStatus {
    const val PENDING = "pending"
    const val SYNCING = "syncing"
    const val FAILED = "failed"
    const val SYNCED = "synced"
}

object OutboxType {
    const val CHECK_IN = "check_in"
    const val CHECK_OUT = "check_out"
    const val PRIVACY_PRE_ACK = "privacy_pre_ack"
}
