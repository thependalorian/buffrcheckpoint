package com.buffrcheckpoint.kiosk.checkin

import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.model.CaptureChannel
import com.buffrcheckpoint.kiosk.core.domain.model.VisitorType
import java.util.UUID
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CheckInMapperTest {

    @Test
    fun `mapper sends string codes not enum names or uuids`() {
        val draft = CheckInDraft(
            siteId = "site-1",
            hostId = "host-1",
            visitorType = VisitorType.CONTRACTOR,
            captureChannel = CaptureChannel.KIOSK,
        )

        val request = draft.toRequest()

        assertEquals("contractor", request.visitorTypeCode)
        assertEquals("kiosk", request.captureChannelCode)
        assertNull(request.purposeCategoryCode)
    }

    @Test
    fun `idempotency key is generated once and passes through unchanged`() {
        val draft = CheckInDraft(
            siteId = "site-1",
            hostId = "host-1",
            visitorType = VisitorType.GENERAL,
            captureChannel = CaptureChannel.ASSISTED,
        )

        val firstRequest = draft.toRequest()
        val secondRequest = draft.toRequest() // simulates a SyncWorker retry using the same draft

        assertEquals(draft.id, firstRequest.id)
        assertEquals(firstRequest.id, secondRequest.id)
        // Sanity: it's a real UUID, not an empty/placeholder string.
        UUID.fromString(draft.id)
    }
}
