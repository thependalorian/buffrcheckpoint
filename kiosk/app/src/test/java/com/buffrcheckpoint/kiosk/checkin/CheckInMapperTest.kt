package com.buffrcheckpoint.kiosk.checkin

import com.buffrcheckpoint.kiosk.core.domain.CheckInDraft
import com.buffrcheckpoint.kiosk.core.domain.FormAnswerDraft
import com.buffrcheckpoint.kiosk.core.domain.model.CaptureChannel
import com.buffrcheckpoint.kiosk.core.domain.model.PurposeCategory
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

    @Test
    fun `mapper mirrors CheckInDto first-class PII fields for visitor_personal_data`() {
        val draft = CheckInDraft(
            siteId = "site-1",
            hostId = "host-1",
            visitorName = "Ada Lovelace",
            visitorPhone = "+264811234567",
            companyName = "Analytical Engines",
            visitorEmail = "ada@example.com",
            vehicleRegistration = "N12345W",
            idDocumentNumber = "123456789",
            visitorType = VisitorType.GENERAL,
            purposeCategory = PurposeCategory.BUSINESS,
            captureChannel = CaptureChannel.KIOSK,
            formAnswers = listOf(
                FormAnswerDraft(
                    formVersionId = "f1111111-1111-4111-8111-111111111201",
                    fieldCode = "company_name",
                    fieldLabelSnapshot = "Organisation / company",
                    value = "Analytical Engines",
                ),
            ),
        )

        val request = draft.toRequest()

        assertEquals("Ada Lovelace", request.visitorName)
        assertEquals("+264811234567", request.visitorPhone)
        assertEquals("Analytical Engines", request.companyName)
        assertEquals("ada@example.com", request.visitorEmail)
        assertEquals("N12345W", request.vehicleRegistration)
        assertEquals("123456789", request.idDocumentNumber)
        assertEquals("business", request.purposeCategoryCode)
        assertEquals(1, request.formAnswers?.size)
        assertEquals("company_name", request.formAnswers?.first()?.fieldCode)
    }
}
