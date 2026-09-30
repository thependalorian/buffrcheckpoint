package com.buffrcheckpoint.kiosk.core.network

import com.buffrcheckpoint.kiosk.core.network.dto.AcknowledgePolicyRequest
import com.buffrcheckpoint.kiosk.core.network.dto.PreCheckinAcknowledgePolicyRequest
import com.buffrcheckpoint.kiosk.core.network.dto.CapabilityStatusResponse
import com.buffrcheckpoint.kiosk.core.network.dto.CheckInRequest
import com.buffrcheckpoint.kiosk.core.network.dto.EffectiveKioskExperienceResponse
import com.buffrcheckpoint.kiosk.core.network.dto.VisitorPolicyVersionRow
import com.buffrcheckpoint.kiosk.core.network.dto.DeviceResponse
import com.buffrcheckpoint.kiosk.core.network.dto.DeviceStatusHistoryRow
import com.buffrcheckpoint.kiosk.core.network.dto.HostRowDto
import com.buffrcheckpoint.kiosk.core.network.dto.LoginRequest
import com.buffrcheckpoint.kiosk.core.network.dto.LoginResponse
import com.buffrcheckpoint.kiosk.core.network.dto.TypeDefinitionRow
import com.buffrcheckpoint.kiosk.core.network.dto.InvitationResolveResponse
import com.buffrcheckpoint.kiosk.core.network.dto.OpenReaderSessionRequest
import com.buffrcheckpoint.kiosk.core.network.dto.OpenReaderSessionResponse
import com.buffrcheckpoint.kiosk.core.network.dto.ValidateCredentialRequest
import com.buffrcheckpoint.kiosk.core.network.dto.ValidateCredentialResponse
import com.buffrcheckpoint.kiosk.core.network.dto.EffectiveCheckInFormDto
import com.buffrcheckpoint.kiosk.core.network.dto.SignOutByPhoneRequest
import com.buffrcheckpoint.kiosk.core.network.dto.SignOutByPhoneResponse
import com.buffrcheckpoint.kiosk.core.network.dto.VisitResponse
import com.buffrcheckpoint.kiosk.core.network.dto.VisitRosterRowDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Real backend contract as read from the NestJS controllers — there is no
 * OpenAPI spec (backend/src/main.ts has no swagger setup), so every route
 * and field here was confirmed against controller/DTO source, not guessed.
 * No global route prefix (main.ts has no setGlobalPrefix/versioning).
 */
interface ApiService {

    // --- auth --------------------------------------------------------
    // Public (@Public()), throttled 10/5min server-side. HTTP 200, not 201.
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    // --- visits --------------------------------------------------------
    @POST("visits/check-in")
    suspend fun checkIn(@Body request: CheckInRequest): VisitResponse

    @POST("visits/{id}/check-out")
    suspend fun checkOut(@Path("id") visitId: String): VisitResponse

    @POST("visits/sign-out-by-phone")
    suspend fun signOutByPhone(@Body request: SignOutByPhoneRequest): SignOutByPhoneResponse

    @GET("visitor-policy/forms/effective")
    suspend fun effectiveCheckInForm(
        @Query("siteId") siteId: String?,
        @Query("visitorTypeCode") visitorTypeCode: String,
        @Query("languageCode") languageCode: String? = "en",
    ): EffectiveCheckInFormDto?

    @GET("visits/roster")
    suspend fun roster(
        @Query("siteId") siteId: String,
        @Query("open") open: String? = null, // literal "false" for full history; omit/anything-else = open-only
    ): List<VisitRosterRowDto>

    @GET("visits/{id}")
    suspend fun getVisit(@Path("id") visitId: String): VisitResponse

    // --- capability-status ---------------------------------------------
    // Public, unauthenticated. Kiosk uses this to honestly hide/gray NFC and
    // DigiNam UI paths rather than claiming a capability that isn't live.
    @GET("public/capability-status")
    suspend fun capabilityStatus(): CapabilityStatusResponse

    @GET("capability-enablement/effective")
    suspend fun effectiveCapabilityStatus(): CapabilityStatusResponse

    // --- type-definitions ------------------------------------------------
    // Generic config-table lookup (Wiebe rule 1) — used to populate
    // dropdowns for domains not hardcoded as Kotlin enums.
    @GET("type-definitions")
    suspend fun typeDefinitions(@Query("domain") domain: String): List<TypeDefinitionRow>

    @GET("hosts")
    suspend fun listHosts(@Query("siteId") siteId: String? = null): List<HostRowDto>

    // --- credentials (NFC fast lane — Phase 5) ---
    @POST("credentials/reader-sessions")
    suspend fun openReaderSession(@Body request: OpenReaderSessionRequest): OpenReaderSessionResponse

    @POST("credentials/validate")
    suspend fun validateCredential(@Body request: ValidateCredentialRequest): ValidateCredentialResponse

    // --- invitations (opaque token resolve) ---
    @GET("public/invitations/resolve")
    suspend fun resolveInvitationToken(@Query("token") token: String): InvitationResolveResponse

    // --- devices (Phase 6 — read-only, admin-facing; no activation call from the kiosk) ---
    @GET("devices")
    suspend fun listDevices(): List<DeviceResponse>

    @GET("devices/{id}/status-history")
    suspend fun deviceStatusHistory(@Path("id") deviceId: String): List<DeviceStatusHistoryRow>

    // --- kiosk experience (Section 11.9.8) --------------------------------
    @GET("kiosk-experience/effective")
    suspend fun effectiveKioskExperience(
        @Query("siteId") siteId: String,
        @Query("deviceId") deviceId: String? = null,
    ): EffectiveKioskExperienceResponse?

    // --- visitor policy (Addition B) ------------------------------------
    @GET("visitor-policy/versions")
    suspend fun visitorPolicyVersions(): List<VisitorPolicyVersionRow>

    @POST("visitor-policy/acknowledgements")
    suspend fun acknowledgePolicy(@Body request: AcknowledgePolicyRequest): Map<String, Any>

    @POST("visitor-policy/acknowledgements/pre-checkin")
    suspend fun acknowledgePolicyPreCheckin(@Body request: PreCheckinAcknowledgePolicyRequest): Map<String, Any>
}
