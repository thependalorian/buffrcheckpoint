package com.buffrcheckpoint.kiosk.sync.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.sync.SyncBannerState
import com.buffrcheckpoint.kiosk.sync.SyncStatusViewModel

@Composable
fun SyncStatusBanner(viewModel: SyncStatusViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    val message = when (state.banner) {
        SyncBannerState.IDLE, SyncBannerState.SYNCED -> return
        SyncBannerState.QUEUED -> "Offline queue: ${state.openCount} pending — host not notified until synced"
        SyncBannerState.SYNCING -> "Syncing ${state.openCount} queued event(s)…"
        SyncBannerState.FAILED -> "Sync failed (${state.openCount}): ${state.lastError ?: "will retry"} — host may not be notified"
    }
    Text(
        text = message,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onErrorContainer,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.errorContainer)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    )
}
