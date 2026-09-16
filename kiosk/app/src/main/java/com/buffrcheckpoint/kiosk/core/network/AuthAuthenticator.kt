package com.buffrcheckpoint.kiosk.core.network

import com.buffrcheckpoint.kiosk.core.network.dto.LoginRequest
import com.buffrcheckpoint.kiosk.core.network.dto.LoginResponse
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import com.squareup.moshi.Moshi
import javax.inject.Inject
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Route

/**
 * The backend has no refresh-token endpoint (auth.module.ts issues only a
 * signed 8h JWT via POST /auth/login) — there is no other way to recover
 * from an expired token than logging in again. This re-POSTs /auth/login
 * with the stored kiosk service-account credentials on any 401, retries the
 * original request once, and gives up (returning null, which surfaces the
 * 401 to the caller) if re-login itself fails or a loop is detected — the
 * kiosk must then show a blocking "needs re-provisioning" screen, never
 * silently fall back to an unauthenticated request.
 */
class AuthAuthenticator @Inject constructor(
    private val credentialStore: CredentialStore,
    private val moshi: Moshi,
) : Authenticator {

    override fun authenticate(route: Route?, response: okhttp3.Response): Request? {
        if (responseCount(response) >= 2) return null // already retried once — avoid an infinite loop

        val baseUrl = credentialStore.baseUrl ?: return null
        val email = credentialStore.serviceAccountEmail ?: return null
        val password = credentialStore.serviceAccountPassword ?: return null

        val newToken = reLogin(baseUrl, email, password) ?: return null
        credentialStore.accessToken = newToken

        return response.request.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .build()
    }

    private fun reLogin(baseUrl: String, email: String, password: String): String? {
        return try {
            val requestAdapter = moshi.adapter(LoginRequest::class.java)
            val responseAdapter = moshi.adapter(LoginResponse::class.java)
            val body = requestAdapter.toJson(LoginRequest(email, password))
                .toRequestBody("application/json".toMediaType())

            val loginUrl = baseUrl.trimEnd('/') + "/auth/login"
            val request = Request.Builder().url(loginUrl).post(body).build()

            // A fresh, un-authenticated client — reusing the app's main
            // client here would recurse back into this same authenticator.
            val plainClient = OkHttpClient.Builder().build()
            plainClient.newCall(request).execute().use { httpResponse ->
                if (!httpResponse.isSuccessful) return null
                val json = httpResponse.body?.string() ?: return null
                responseAdapter.fromJson(json)?.accessToken
            }
        } catch (_ : Exception) {
            null
        }
    }

    private fun responseCount(response: okhttp3.Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
