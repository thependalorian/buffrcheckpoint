package com.buffrcheckpoint.kiosk.core.network

import com.buffrcheckpoint.kiosk.BuildConfig
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ApiClient {

    fun moshi(): Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    fun okHttpClient(
        authInterceptor: AuthInterceptor,
        authAuthenticator: AuthAuthenticator,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            // Never log request/response bodies in a build that ships — visitor
            // PII (names, phone numbers) would otherwise land in logcat.
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(authAuthenticator)
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    fun retrofit(baseUrl: String, okHttpClient: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    fun apiService(baseUrl: String, okHttpClient: OkHttpClient, moshi: Moshi): ApiService =
        retrofit(baseUrl, okHttpClient, moshi).create(ApiService::class.java)
}
