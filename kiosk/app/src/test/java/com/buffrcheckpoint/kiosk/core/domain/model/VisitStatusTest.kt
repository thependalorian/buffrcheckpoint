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
        // pending_approval is now seeded (0001) and present on VisitStatus —
        // only truly unknown codes must fail closed.
        assertEquals(VisitStatus.PENDING_APPROVAL, VisitStatus.fromCodeOrNull("pending_approval"))
        assertNull(VisitStatus.fromCodeOrNull("invited"))
        assertNull(VisitStatus.fromCodeOrNull("denied"))
        assertNull(VisitStatus.fromCodeOrNull("not_a_real_status"))
        assertNull(VisitStatus.fromCodeOrNull(null))
    }
}
