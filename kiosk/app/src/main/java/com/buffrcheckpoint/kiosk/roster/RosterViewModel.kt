package com.buffrcheckpoint.kiosk.roster

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.core.domain.RosterEntry
import com.buffrcheckpoint.kiosk.core.security.CredentialStore
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RosterUiState(
    val isLoading: Boolean = false,
    val entries: List<RosterEntry> = emptyList(),
    val errorMessage: String? = null,
    val fromCache: Boolean = false,
)

@HiltViewModel
class RosterViewModel @Inject constructor(
    private val rosterRepository: RosterRepository,
    private val credentialStore: CredentialStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RosterUiState())
    val uiState: StateFlow<RosterUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val siteId = credentialStore.siteId ?: return
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            when (val result = rosterRepository.openRoster(siteId)) {
                is RosterResult.Success ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        entries = result.entries,
                        fromCache = result.fromCache,
                        errorMessage = if (result.fromCache) "Showing cached roster (offline)." else null,
                    )
                is RosterResult.Failure ->
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = result.message, fromCache = false)
            }
        }
    }
}
