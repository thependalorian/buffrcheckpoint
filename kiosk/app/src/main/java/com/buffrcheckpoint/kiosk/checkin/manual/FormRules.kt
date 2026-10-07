package com.buffrcheckpoint.kiosk.checkin.manual

/**
 * Kotlin port of @buffrcheckpoint/shared form-rules (buffrcheckpoint.md §8.2).
 * Keep condition operators in sync with the TypeScript evaluator.
 */
object FormRules {
    @Suppress("UNCHECKED_CAST")
    fun isFieldVisible(
        visibilityRule: Map<String, Any?>?,
        answers: Map<String, String>,
    ): Boolean = evaluateRule(visibilityRule, answers)

    @Suppress("UNCHECKED_CAST")
    fun isFieldRequired(
        required: Boolean,
        validationSchema: Map<String, Any?>?,
        answers: Map<String, String>,
    ): Boolean {
        if (required) return true
        val requiredIf = validationSchema?.get("requiredIf") as? Map<String, Any?>
        return if (requiredIf != null) evaluateRule(requiredIf, answers) else false
    }

    @Suppress("UNCHECKED_CAST")
    private fun evaluateRule(
        rule: Map<String, Any?>?,
        answers: Map<String, String>,
    ): Boolean {
        if (rule.isNullOrEmpty()) return true
        val conditions = rule["conditions"] as? List<*> ?: return true
        if (conditions.isEmpty()) return true
        val op = (rule["op"] as? String)?.lowercase() ?: "and"
        val results = conditions.mapNotNull { raw ->
            val condition = raw as? Map<*, *> ?: return@mapNotNull null
            conditionMatches(condition, answers)
        }
        if (results.isEmpty()) return true
        return if (op == "or") results.any { it } else results.all { it }
    }

    private fun conditionMatches(condition: Map<*, *>, answers: Map<String, String>): Boolean {
        val fieldCode = condition["fieldCode"] as? String ?: return true
        val scalar = answers[fieldCode].orEmpty().trim()
        if (condition["notEmpty"] == true) return scalar.isNotEmpty()
        val equals = condition["equals"] as? String
        if (equals != null) return scalar == equals
        val inList = condition["in"] as? List<*>
        if (inList != null) return inList.map { it?.toString() }.contains(scalar)
        return true
    }
}
