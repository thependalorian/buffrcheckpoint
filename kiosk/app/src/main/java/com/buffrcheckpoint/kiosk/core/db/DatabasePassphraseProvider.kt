package com.buffrcheckpoint.kiosk.core.db

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.KeyGenerator
import javax.inject.Inject
import javax.inject.Singleton

/**
 * SQLCipher passphrase is Keystore-backed. Plain sqlite3 against an adb-pulled
 * DB file must fail without this passphrase (§11.7.5).
 */
@Singleton
class DatabasePassphraseProvider @Inject constructor(
    private val appContext: Context,
) {
    fun passphrase(): ByteArray {
        val masterKey = MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        val prefs = EncryptedSharedPreferences.create(
            appContext,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
        val existing = prefs.getString(KEY_PASSPHRASE, null)
        if (existing != null) {
            return existing.toByteArray(Charsets.UTF_8)
        }
        ensureAndroidKeystoreKey()
        val generated = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val encoded = generated.joinToString("") { "%02x".format(it) }
        prefs.edit().putString(KEY_PASSPHRASE, encoded).apply()
        return encoded.toByteArray(Charsets.UTF_8)
    }

    private fun ensureAndroidKeystoreKey() {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (keyStore.containsAlias(KEYSTORE_ALIAS)) return
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        keyGenerator.init(
            KeyGenParameterSpec.Builder(
                KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        keyGenerator.generateKey()
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEYSTORE_ALIAS = "buffr_kiosk_sqlcipher_wrap"
        private const val PREFS_NAME = "buffr_kiosk_db_passphrase"
        private const val KEY_PASSPHRASE = "sqlcipher_passphrase_hex"
    }
}
