package com.buffrcheckpoint.kiosk.sync

import com.buffrcheckpoint.kiosk.core.db.OutboxStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class SyncBannerMappingTest {

    @Test
    fun mapsFailedWhenAnyFailed() {
        val banner = when {
            listOf(OutboxStatus.FAILED).isEmpty() -> SyncBannerState.IDLE
            listOf(OutboxStatus.FAILED).any { it == OutboxStatus.FAILED } -> SyncBannerState.FAILED
            else -> SyncBannerState.QUEUED
        }
        assertEquals(SyncBannerState.FAILED, banner)
    }

    @Test
    fun mapsQueuedWhenPendingOnly() {
        val open = listOf(OutboxStatus.PENDING, OutboxStatus.PENDING)
        val banner = when {
            open.isEmpty() -> SyncBannerState.IDLE
            open.any { it == OutboxStatus.FAILED } -> SyncBannerState.FAILED
            open.any { it == OutboxStatus.SYNCING } -> SyncBannerState.SYNCING
            else -> SyncBannerState.QUEUED
        }
        assertEquals(SyncBannerState.QUEUED, banner)
    }
}
