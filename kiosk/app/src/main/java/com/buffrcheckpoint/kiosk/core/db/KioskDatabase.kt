package com.buffrcheckpoint.kiosk.core.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [OutboxEntity::class, RosterCacheEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class KioskDatabase : RoomDatabase() {
    abstract fun outboxDao(): OutboxDao
    abstract fun rosterCacheDao(): RosterCacheDao
}
