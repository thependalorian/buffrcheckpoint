package com.buffrcheckpoint.kiosk

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.buffrcheckpoint.kiosk.experience.ExperienceSyncWorker
import com.buffrcheckpoint.kiosk.sync.OutboxDrainWorker
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class BuffrCheckpointApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override fun onCreate() {
        super.onCreate()
        initSentry()
        ExperienceSyncWorker.schedule(this)
        OutboxDrainWorker.enqueue(this)
    }

    private fun initSentry() {
        val dsn = BuildConfig.SENTRY_DSN
        if (dsn.isBlank()) return
        io.sentry.android.core.SentryAndroid.init(this) { options ->
            options.dsn = dsn
            options.isSendDefaultPii = false
            options.environment = if (BuildConfig.DEBUG) "development" else "production"
            options.beforeSend = io.sentry.SentryOptions.BeforeSendCallback { event, _ ->
                event.setTag("surface", "kiosk")
                event
            }
        }
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
