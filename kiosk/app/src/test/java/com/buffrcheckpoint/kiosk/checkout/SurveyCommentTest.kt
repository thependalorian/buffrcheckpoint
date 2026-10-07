package com.buffrcheckpoint.kiosk.checkout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SurveyCommentTest {
    @Test
    fun blankOrMissingCommentsAreOmitted() {
        assertNull(normaliseSurveyComment(null))
        assertNull(normaliseSurveyComment(""))
        assertNull(normaliseSurveyComment("   \n\t  "))
    }

    @Test
    fun trimsAndNormalisesLineBreaks() {
        assertEquals("Line one\nLine two", normaliseSurveyComment("  Line one\r\nLine two\r  "))
    }

    @Test
    fun stopsAtTheServerLimit() {
        val long = "a".repeat(MAX_SURVEY_COMMENT + 250)
        assertEquals(MAX_SURVEY_COMMENT, normaliseSurveyComment(long)?.length)
        assertEquals(1000, MAX_SURVEY_COMMENT)
    }
}
