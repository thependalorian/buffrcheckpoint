package com.buffrcheckpoint.kiosk.core.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface OutboxDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(entity: OutboxEntity)

    @Query(
        """
        SELECT * FROM outbox_events
        WHERE status IN ('pending', 'failed')
        ORDER BY createdAtEpochMs ASC
        LIMIT 1
        """,
    )
    suspend fun nextPending(): OutboxEntity?

    @Query("SELECT * FROM outbox_events WHERE status IN ('pending', 'failed', 'syncing') ORDER BY createdAtEpochMs ASC")
    fun observeOpen(): Flow<List<OutboxEntity>>

    @Query("SELECT COUNT(*) FROM outbox_events WHERE status IN ('pending', 'failed', 'syncing')")
    fun observeOpenCount(): Flow<Int>

    @Query("UPDATE outbox_events SET status = :status, attemptCount = :attemptCount, lastError = :lastError, updatedAtEpochMs = :updatedAt WHERE id = :id")
    suspend fun updateStatus(
        id: String,
        status: String,
        attemptCount: Int,
        lastError: String?,
        updatedAt: Long,
    )

    @Query("DELETE FROM outbox_events WHERE status = 'synced' AND updatedAtEpochMs < :beforeEpochMs")
    suspend fun pruneSynced(beforeEpochMs: Long)

    @Query(
        """
        DELETE FROM outbox_events
        WHERE status IN ('pending', 'failed', 'syncing')
        """,
    )
    suspend fun deletePendingDrafts()
}

@Dao
interface RosterCacheDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(rows: List<RosterCacheEntity>)

    @Query("DELETE FROM roster_cache WHERE siteId = :siteId")
    suspend fun clearSite(siteId: String)

    @Query("SELECT * FROM roster_cache WHERE siteId = :siteId ORDER BY checkedInAt DESC")
    suspend fun forSite(siteId: String): List<RosterCacheEntity>

    @Transaction
    suspend fun replaceSite(siteId: String, rows: List<RosterCacheEntity>) {
        clearSite(siteId)
        if (rows.isNotEmpty()) upsertAll(rows)
    }
}
