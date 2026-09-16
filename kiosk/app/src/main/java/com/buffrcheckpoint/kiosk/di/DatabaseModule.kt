package com.buffrcheckpoint.kiosk.di

import android.content.Context
import androidx.room.Room
import com.buffrcheckpoint.kiosk.core.db.DatabasePassphraseProvider
import com.buffrcheckpoint.kiosk.core.db.KioskDatabase
import com.buffrcheckpoint.kiosk.core.db.OutboxDao
import com.buffrcheckpoint.kiosk.core.db.RosterCacheDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabasePassphraseProvider(
        @ApplicationContext context: Context,
    ): DatabasePassphraseProvider = DatabasePassphraseProvider(context)

    @Provides
    @Singleton
    fun provideKioskDatabase(
        @ApplicationContext context: Context,
        passphraseProvider: DatabasePassphraseProvider,
    ): KioskDatabase {
        System.loadLibrary("sqlcipher")
        val factory = SupportOpenHelperFactory(passphraseProvider.passphrase())
        return Room.databaseBuilder(context, KioskDatabase::class.java, "buffr_kiosk.db")
            .openHelperFactory(factory)
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideOutboxDao(db: KioskDatabase): OutboxDao = db.outboxDao()

    @Provides
    fun provideRosterCacheDao(db: KioskDatabase): RosterCacheDao = db.rosterCacheDao()
}
