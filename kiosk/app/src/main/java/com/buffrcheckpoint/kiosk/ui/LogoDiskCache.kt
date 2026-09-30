package com.buffrcheckpoint.kiosk.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LogoDiskCache @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val cacheDir: File
        get() = File(context.filesDir, "logo_cache").also { it.mkdirs() }

    fun load(url: String?): Bitmap? {
        if (url.isNullOrBlank()) return null
        val file = cacheFile(url)
        if (file.exists()) {
            val cached = BitmapFactory.decodeFile(file.absolutePath)
            if (cached != null) return cached
            file.delete()
        }
        return downloadAndCache(url, file)
    }

    /** Warm the disk cache after a successful experience sync. */
    fun prefetch(url: String?) {
        if (url.isNullOrBlank()) return
        load(url)
    }

    fun clear() {
        cacheDir.listFiles()?.forEach { it.delete() }
    }

    private fun downloadAndCache(url: String, file: File): Bitmap? {
        return runCatching {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = true
                connectTimeout = 10_000
                readTimeout = 10_000
                requestMethod = "GET"
            }
            try {
                val code = connection.responseCode
                if (code !in 200..299) {
                    file.delete()
                    return null
                }
                connection.inputStream.use { stream ->
                    val bytes = stream.readBytes()
                    if (bytes.isEmpty()) {
                        file.delete()
                        return null
                    }
                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    if (bitmap == null) {
                        file.delete()
                        return null
                    }
                    file.writeBytes(bytes)
                    bitmap
                }
            } finally {
                connection.disconnect()
            }
        }.getOrElse {
            file.delete()
            null
        }
    }

    private fun cacheFile(url: String): File {
        val digest = MessageDigest.getInstance("SHA-256").digest(url.toByteArray())
        val name = digest.joinToString("") { "%02x".format(it) }
        return File(cacheDir, "$name.png")
    }
}
