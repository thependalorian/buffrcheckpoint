package com.buffrcheckpoint.kiosk.auth

import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.LoginRequest
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import com.buffrcheckpoint.kiosk.experience.ExperienceRepository
import javax.inject.Inject
import javax.inject.Singleton

sealed interface LoginResult {
    data object Success : LoginResult
    data class Failure(val message: String) : LoginResult
}

@Singleton
class AuthRepository @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    private val credentialStore: CredentialStore,
    private val experienceRepository: ExperienceRepository,
) {
    fun hasSiteConfiguration(): Boolean = credentialStore.hasSiteConfiguration()

    fun isProvisioned(): Boolean = credentialStore.isProvisioned()

    fun isLoggedIn(): Boolean = !credentialStore.accessToken.isNullOrBlank()

    fun savedSiteConfiguration(): Pair<String, String>? {
        val baseUrl = credentialStore.baseUrl?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val siteId = credentialStore.siteId?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return baseUrl to siteId
    }

    fun savedServiceAccountEmail(): String? =
        credentialStore.serviceAccountEmail?.trim()?.takeIf { it.isNotEmpty() }

    fun provision(baseUrl: String, siteId: String) {
        credentialStore.baseUrl = baseUrl
        credentialStore.siteId = siteId
    }

    suspend fun login(email: String, password: String): LoginResult {
        return try {
            val response = apiServiceProvider.get().login(LoginRequest(email, password))
            credentialStore.serviceAccountEmail = email
            credentialStore.serviceAccountPassword = password
            credentialStore.accessToken = response.accessToken
            runCatching { experienceRepository.syncFromBackend() }
            LoginResult.Success
        } catch (e: retrofit2.HttpException) {
            val message = when (e.code()) {
                401 -> "Incorrect email or password."
                429 -> "Too many login attempts — wait a few minutes and try again."
                else -> "Login failed (HTTP ${e.code()})."
            }
            LoginResult.Failure(message)
        } catch (e: java.io.IOException) {
            LoginResult.Failure("Can't reach the server — check the kiosk's network connection and base URL.")
        }
    }

    fun logout() {
        credentialStore.clearToken()
    }
}
