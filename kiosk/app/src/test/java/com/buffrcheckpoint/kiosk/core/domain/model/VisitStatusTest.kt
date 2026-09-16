package com.buffrcheckpoint.kiosk.core.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VisitStatusTest {

    @Test
    fun `only the 4 real seeded values deserialize`() {
        assertEquals(VisitStatus.PENDING_SYNC, VisitStatus.fromCodeOrNull("pending_sync"))
        assertEquals(VisitStatus.CHECKED_IN, VisitStatus.fromCodeOrNull("checked_in"))
        assertEquals(VisitStatus.CHECKED_OUT, VisitStatus.fromCodeOrNull("checked_out"))
        assertEquals(VisitStatus.SYNCED_ACK, VisitStatus.fromCodeOrNull("synced_ack"))
    }

    @Test
    fun `unknown or doc-invented values fail closed to null instead of crashing`() {
        // These were in the aspirational buffrcheckpoint.md model but were never
        // seeded server-side (backend/db/seed/0001_type_definitions.sql) — the
        // kiosk must not assume they exist.
        assertNull(VisitStatus.fromCodeOrNull("invited"))
        assertNull(VisitStatus.fromCodeOrNull("denied"))
        assertNull(VisitStatus.fromCodeOrNull("pending_approval"))
        assertNull(VisitStatus.fromCodeOrNull(null))
    }
}
