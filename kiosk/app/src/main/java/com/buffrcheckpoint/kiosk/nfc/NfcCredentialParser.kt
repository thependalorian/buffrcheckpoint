package com.buffrcheckpoint.kiosk.nfc

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.Tag
import android.nfc.tech.Ndef

/**
 * Parses the server-issued opaque credential reference from an NDEF payload.
 * Never uses the tag UID for authentication.
 */
object NfcCredentialParser {
    fun parseReference(tag: Tag): String? {
        val ndef = Ndef.get(tag) ?: return null
        ndef.connect()
        try {
            val message = ndef.ndefMessage ?: return null
            return parseMessage(message)
        } finally {
            runCatching { ndef.close() }
        }
    }

    fun parseMessage(message: NdefMessage): String? {
        for (record in message.records) {
            parseRecord(record)?.let { return it }
        }
        return null
    }

    fun parseRecord(record: NdefRecord): String? {
        return when (record.tnf) {
            NdefRecord.TNF_WELL_KNOWN -> {
                if (record.type.contentEquals(NdefRecord.RTD_TEXT)) {
                    parseTextPayload(record.payload)
                } else if (record.type.contentEquals(NdefRecord.RTD_URI)) {
                    parseUriPayload(record.payload)?.let { extractReferenceFromUri(it) }
                } else {
                    null
                }
            }
            NdefRecord.TNF_MIME_MEDIA -> {
                String(record.payload, Charsets.UTF_8).trim().ifBlank { null }
            }
            else -> String(record.payload, Charsets.UTF_8).trim().ifBlank { null }
        }
    }

    fun parseTextPayload(payload: ByteArray): String? {
        if (payload.isEmpty()) return null
        val status = payload[0].toInt()
        val languageCodeLength = status and 0x3F
        val isUtf16 = (status and 0x80) != 0
        if (1 + languageCodeLength > payload.size) return null
        val textBytes = payload.copyOfRange(1 + languageCodeLength, payload.size)
        val charset = if (isUtf16) Charsets.UTF_16 else Charsets.UTF_8
        return String(textBytes, charset).trim().ifBlank { null }
    }

    fun parseUriPayload(payload: ByteArray): String? {
        if (payload.isEmpty()) return null
        val prefixCode = payload[0].toInt() and 0xFF
        val prefix = URI_PREFIXES.getOrElse(prefixCode) { "" }
        return prefix + String(payload, 1, payload.size - 1, Charsets.UTF_8)
    }

    fun extractReferenceFromUri(uri: String): String? {
        val marker = "ref="
        val idx = uri.indexOf(marker)
        if (idx >= 0) return uri.substring(idx + marker.length).substringBefore('&').ifBlank { null }
        return uri.substringAfterLast('/').ifBlank { null }
    }

    private val URI_PREFIXES = arrayOf(
        "", "http://www.", "https://www.", "http://", "https://", "tel:", "mailto:",
        "ftp://anonymous:anonymous@", "ftp://ftp.", "ftps://", "sftp://", "smb://",
        "nfs://", "ftp://", "dav://", "news:", "telnet://", "imap:", "rtsp://", "urn:",
        "pop:", "sip:", "sips:", "tftp:", "btspp://", "btl2cap://", "btgoep://",
        "tcpobex://", "irdaobex://", "file://", "urn:epc:id:", "urn:epc:tag:",
        "urn:epc:pat:", "urn:epc:raw:", "urn:epc:", "urn:nfc:",
    )
}
