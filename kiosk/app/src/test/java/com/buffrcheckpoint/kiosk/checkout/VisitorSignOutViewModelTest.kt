package com.buffrcheckpoint.kiosk.checkout

import com.buffrcheckpoint.kiosk.core.network.ApiService
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.SignOutByPhoneResponse
import com.buffrcheckpoint.kiosk.core.network.dto.SurveyOptionDto
import com.buffrcheckpoint.kiosk.core.network.dto.SurveySubmitRequest
import com.buffrcheckpoint.kiosk.core.network.dto.SurveySubmitResponse
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class VisitorSignOutViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val api = mockk<ApiService>()
    private val provider = mockk<ApiServiceProvider> { every { get() } returns api }
    private val credentials = mockk<CredentialStore> { every { siteId } returns "site-1" }
    private val options = listOf(
        SurveyOptionDto("very_poor", "Very poor", 1),
        SurveyOptionDto("good", "Good", 4),
    )

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    private fun signedOut(token: String?) = SignOutByPhoneResponse("visit-1", "site-1", "2026-10-02T08:00:00Z", "ABC123", token)

    @Test
    fun offersSurveyAndWaitsBeforeFinishing() = runTest(dispatcher) {
        coEvery { api.signOutByPhone(any()) } returns signedOut("token-1")
        coEvery { api.surveyOptions() } returns options
        val vm = VisitorSignOutViewModel(provider, credentials)
        var done = 0
        vm.onPhoneChange("+264811234567")
        vm.signOut { done++ }
        advanceUntilIdle()
        assertEquals("token-1", vm.uiState.value.surveyToken)
        assertEquals(options, vm.uiState.value.surveyOptions)
        assertEquals(0, done)
    }

    @Test
    fun ratingSubmitsTokenAndCodeThenFinishes() = runTest(dispatcher) {
        coEvery { api.signOutByPhone(any()) } returns signedOut("token-1")
        coEvery { api.surveyOptions() } returns options
        coEvery { api.submitSurvey(any()) } returns SurveySubmitResponse(recorded = true, duplicate = false)
        val vm = VisitorSignOutViewModel(provider, credentials)
        var done = 0
        vm.onPhoneChange("+264811234567")
        vm.signOut { done++ }
        advanceUntilIdle()
        vm.submitRating("good") { done++ }
        advanceUntilIdle()
        coVerify { api.submitSurvey(SurveySubmitRequest(token = "token-1", ratingCode = "good")) }
        assertEquals(1, done)
        assertNull(vm.uiState.value.surveyToken)
    }

    @Test
    fun failedRatingStillFinishes() = runTest(dispatcher) {
        coEvery { api.signOutByPhone(any()) } returns signedOut("token-1")
        coEvery { api.surveyOptions() } returns options
        coEvery { api.submitSurvey(any()) } throws RuntimeException("offline")
        val vm = VisitorSignOutViewModel(provider, credentials)
        var done = 0
        vm.onPhoneChange("+264811234567")
        vm.signOut { done++ }
        advanceUntilIdle()
        vm.submitRating("good") { done++ }
        advanceUntilIdle()
        assertEquals(1, done)
    }

    @Test
    fun noTokenOrNoOptionsFinishesImmediately() = runTest(dispatcher) {
        coEvery { api.signOutByPhone(any()) } returns signedOut(null)
        val vm = VisitorSignOutViewModel(provider, credentials)
        var done = 0
        vm.onPhoneChange("+264811234567")
        vm.signOut { done++ }
        advanceUntilIdle()
        assertEquals(1, done)
        assertNull(vm.uiState.value.surveyToken)

        coEvery { api.signOutByPhone(any()) } returns signedOut("token-2")
        coEvery { api.surveyOptions() } throws RuntimeException("offline")
        vm.signOut { done++ }
        advanceUntilIdle()
        assertEquals(2, done)
    }
}
