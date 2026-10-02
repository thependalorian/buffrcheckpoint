package com.buffrcheckpoint.kiosk.checkout

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.buffrcheckpoint.kiosk.checkout.ui.VisitSurveyPrompt
import com.buffrcheckpoint.kiosk.core.network.dto.SurveyOptionDto
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class VisitSurveyPromptTest {
    @get:Rule
    val compose = createComposeRule()

    private val options = listOf(
        SurveyOptionDto("very_poor", "Very poor", 1),
        SurveyOptionDto("poor", "Poor", 2),
        SurveyOptionDto("neutral", "Neutral", 3),
        SurveyOptionDto("good", "Good", 4),
        SurveyOptionDto("very_good", "Very good", 5),
    )

    @Test
    fun rendersAllRatingsAndReportsTheTappedCode() {
        var rated: String? = null
        compose.setContent {
            VisitSurveyPrompt("Signed out · ABC123.", options, submitting = false, onRate = { rated = it }, onSkip = {})
        }
        compose.onNodeWithText("How was your visit today?").assertIsDisplayed()
        options.forEach { compose.onNodeWithTag("survey-option-${it.code}").assertIsDisplayed() }
        compose.onNodeWithTag("survey-option-very_good").performClick()
        assertEquals("very_good", rated)
    }

    @Test
    fun skipFinishesWithoutRating() {
        var skipped = 0
        var rated: String? = null
        compose.setContent {
            VisitSurveyPrompt(null, options, submitting = false, onRate = { rated = it }, onSkip = { skipped++ })
        }
        compose.onNodeWithTag("survey-skip").performClick()
        assertEquals(1, skipped)
        assertEquals(null, rated)
    }
}
