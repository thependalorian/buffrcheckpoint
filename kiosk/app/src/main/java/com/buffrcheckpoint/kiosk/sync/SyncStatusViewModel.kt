package com.buffrcheckpoint.kiosk.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class SyncStatusViewModel @Inject constructor(
    outboxRepository: OutboxRepository,
) : ViewModel() {
    val uiState: StateFlow<SyncUiState> = outboxRepository.observeSyncUi()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SyncUiState())
}
