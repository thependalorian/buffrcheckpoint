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
            return BitmapFactory.decodeFile(file.absolutePath)
        }
        return downloadAndCache(url, file)
    }

    private fun downloadAndCache(url: String, file: File): Bitmap? {
        return runCatching {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.inputStream.use { stream ->
                val bytes = stream.readBytes()
                file.writeBytes(bytes)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            }
        }.getOrNull()
    }

    private fun cacheFile(url: String): File {
        val digest = MessageDigest.getInstance("SHA-256").digest(url.toByteArray())
        val name = digest.joinToString("") { "%02x".format(it) }
        return File(cacheDir, "$name.png")
    }
}
