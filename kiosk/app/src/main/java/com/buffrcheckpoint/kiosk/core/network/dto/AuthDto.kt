package com.buffrcheckpoint.kiosk.core.network.dto

import com.squareup.moshi.JsonClass

// Mirrors backend/src/modules/auth/dto/login.dto.ts — POST /auth/login body.
@JsonClass(generateAdapter = true)
data class LoginRequest(
    val email: String,
    val password: String,
)

// Mirrors auth.controller.ts's AccessTokenResult. No refresh token exists —
// the backend issues only a signed 8h JWT (auth.module.ts). AuthAuthenticator
// works around the missing refresh endpoint by re-calling /auth/login.
@JsonClass(generateAdapter = true)
data class LoginResponse(
    val accessToken: String,
    val emailVerified: Boolean,
)
