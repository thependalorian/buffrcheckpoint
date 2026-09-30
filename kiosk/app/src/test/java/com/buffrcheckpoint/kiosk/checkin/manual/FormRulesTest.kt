package com.buffrcheckpoint.kiosk.checkin.manual

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FormRulesTest {
    @Test
    fun emptyRuleIsAlwaysVisible() {
        assertTrue(FormRules.isFieldVisible(emptyMap(), emptyMap()))
        assertTrue(FormRules.isFieldVisible(null, emptyMap()))
    }

    @Test
    fun equalsConditionControlsVisibility() {
        val rule = mapOf(
            "op" to "and",
            "conditions" to listOf(
                mapOf("fieldCode" to "purpose_category", "equals" to "vehicle"),
            ),
        )
        assertTrue(
            FormRules.isFieldVisible(rule, mapOf("purpose_category" to "vehicle")),
        )
        assertFalse(
            FormRules.isFieldVisible(rule, mapOf("purpose_category" to "meeting")),
        )
    }

    @Test
    fun requiredIfMatchesCondition() {
        val schema = mapOf(
            "requiredIf" to mapOf(
                "conditions" to listOf(
                    mapOf("fieldCode" to "purpose_category", "equals" to "vehicle"),
                ),
            ),
        )
        assertTrue(
            FormRules.isFieldRequired(false, schema, mapOf("purpose_category" to "vehicle")),
        )
        assertFalse(
            FormRules.isFieldRequired(false, schema, mapOf("purpose_category" to "meeting")),
        )
        assertTrue(
            FormRules.isFieldRequired(true, schema, mapOf("purpose_category" to "meeting")),
        )
    }
}
