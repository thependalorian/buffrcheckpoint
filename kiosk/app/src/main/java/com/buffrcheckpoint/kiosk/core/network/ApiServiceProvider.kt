package com.buffrcheckpoint.kiosk.core.network

import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The kiosk's base URL is set at runtime during first-run provisioning
 * (KioskSetupScreen), not known when the Hilt graph is built — so ApiService
 * can't be a plain @Provides singleton keyed on a compile-time constant.
 * This lazily builds (and rebuilds, if the base URL changes) the
 * Retrofit/OkHttp stack behind a stable reference callers can hold onto.
 */
@Singleton
class ApiServiceProvider @Inject constructor(
    private val credentialStore: CredentialStore,
    private val authInterceptor: AuthInterceptor,
    private val authAuthenticator: AuthAuthenticator,
) {
    private val moshi = ApiClient.moshi()
    private var cachedBaseUrl: String? = null
    private var cachedService: ApiService? = null

    fun get(): ApiService {
        val baseUrl = credentialStore.baseUrl
            ?: error("Kiosk is not provisioned yet — no base URL set. Complete KioskSetupScreen first.")

        val cached = cachedService
        if (cached != null && baseUrl == cachedBaseUrl) return cached

        val client = ApiClient.okHttpClient(authInterceptor, authAuthenticator)
        val service = ApiClient.apiService(baseUrl, client, moshi)
        cachedBaseUrl = baseUrl
        cachedService = service
        return service
    }
}
