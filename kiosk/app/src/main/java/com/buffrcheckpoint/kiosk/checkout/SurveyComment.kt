package com.buffrcheckpoint.kiosk.checkout

/** The most characters the rating comment may hold. The server refuses more, so the kiosk stops at the same figure. */
const val MAX_SURVEY_COMMENT = 1000

/**
 * What is sent as the optional comment: line breaks normalised, trimmed, capped at [MAX_SURVEY_COMMENT], and null when nothing
 * was typed so the request carries no empty comment.
 */
fun normaliseSurveyComment(text: String?): String? {
    val cleaned = text.orEmpty().replace("\r\n", "\n").replace('\r', '\n').trim()
    if (cleaned.isEmpty()) return null
    return cleaned.take(MAX_SURVEY_COMMENT).trim()
}
