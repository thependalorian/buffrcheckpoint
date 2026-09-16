package com.buffrcheckpoint.kiosk.nfc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NfcCredentialParserTest {

    @Test
    fun parseTextPayload_returnsOpaqueReference() {
        val language = "en"
        val text = "abc123credentialref"
        val status = language.length.toByte()
        val payload = byteArrayOf(status) + language.toByteArray(Charsets.US_ASCII) + text.toByteArray(Charsets.UTF_8)
        assertEquals(text, NfcCredentialParser.parseTextPayload(payload))
    }

    @Test
    fun parseUriPayload_andExtractRef() {
        val uriBody = "buffrcheckpoint.com/c?ref=deadbeef".toByteArray(Charsets.UTF_8)
        val payload = byteArrayOf(0x04) + uriBody // 0x04 = https://
        val uri = NfcCredentialParser.parseUriPayload(payload)
        assertEquals("https://buffrcheckpoint.com/c?ref=deadbeef", uri)
        assertEquals("deadbeef", NfcCredentialParser.extractReferenceFromUri(uri!!))
    }

    @Test
    fun extractReferenceFromUri_blankPath_returnsNull() {
        assertNull(NfcCredentialParser.extractReferenceFromUri("https://example.com/"))
    }
}
