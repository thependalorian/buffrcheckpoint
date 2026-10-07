package com.buffrcheckpoint.kiosk.checkout

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
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
    fun rendersAllRatingsAndSendsTheChosenRatingWithoutACommentWhenNoneIsTyped() {
        var sent: Pair<String, String?>? = null
        compose.setContent {
            VisitSurveyPrompt("Signed out · ABC123.", options, submitting = false, onRate = { code, text -> sent = code to text }, onSkip = {})
        }
        compose.onNodeWithText("How was your visit today?").assertIsDisplayed()
        options.forEach { compose.onNodeWithTag("survey-option-${it.code}").assertIsDisplayed() }
        compose.onNodeWithTag("survey-submit").assertIsNotEnabled()
        compose.onNodeWithTag("survey-option-very_good").performClick()
        compose.onNodeWithTag("survey-submit").assertIsEnabled().performClick()
        assertEquals("very_good" to "", sent)
    }

    @Test
    fun sendsTheTypedCommentWithTheRating() {
        var sent: Pair<String, String?>? = null
        compose.setContent {
            VisitSurveyPrompt(null, options, submitting = false, onRate = { code, text -> sent = code to text }, onSkip = {})
        }
        compose.onNodeWithTag("survey-option-good").performClick()
        compose.onNodeWithTag("survey-comment").performTextInput("Quick and friendly.")
        compose.onNodeWithTag("survey-submit").performClick()
        assertEquals("good" to "Quick and friendly.", sent)
    }

    @Test
    fun skipFinishesWithoutRating() {
        var skipped = 0
        var rated: String? = null
        compose.setContent {
            VisitSurveyPrompt(null, options, submitting = false, onRate = { code, _ -> rated = code }, onSkip = { skipped++ })
        }
        compose.onNodeWithTag("survey-skip").performClick()
        assertEquals(1, skipped)
        assertEquals(null, rated)
    }
}
