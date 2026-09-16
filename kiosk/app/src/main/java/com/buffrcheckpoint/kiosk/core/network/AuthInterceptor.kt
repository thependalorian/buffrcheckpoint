package com.buffrcheckpoint.kiosk.core.network

import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import javax.inject.Inject
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor @Inject constructor(
    private val credentialStore: CredentialStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = credentialStore.accessToken
        val authorized = if (token != null) {
            request.newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            request
        }
        return chain.proceed(authorized)
    }
}
