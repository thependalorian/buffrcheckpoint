package com.buffrcheckpoint.kiosk.core.network.dto

data class VisitorPolicyVersionRow(
    val id: String,
    val policyDocumentId: String,
    val policyCode: String,
    val policyName: String?,
    val category: String?,
    val versionNumber: Int,
    val contentArtifactId: String?,
    val contentHash: String?,
    val effectiveFrom: String?,
)

data class AcknowledgePolicyRequest(
    val visitId: String,
    val policyVersionId: String,
    val legalBasisCode: String,
    val languageShownCode: String,
    val acknowledgementMethodCode: String,
    val displayedAt: String,
    val acceptedAt: String,
)

data class PreCheckinAcknowledgePolicyRequest(
    val siteId: String,
    val kioskSessionId: String,
    val policyVersionId: String,
    val legalBasisCode: String,
    val languageShownCode: String,
    val acknowledgementMethodCode: String,
    val displayedAt: String,
    val acceptedAt: String,
    val captureChannelCode: String? = null,
)
