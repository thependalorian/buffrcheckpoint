package com.buffrcheckpoint.kiosk.about.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
fun AboutDebugScreen(
    onBack: () -> Unit,
    syncViewModel: SyncStatusViewModel = hiltViewModel(),
) {
    val sync by syncViewModel.uiState.collectAsState()
    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("About / Debug", style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "Android Keystore attestation on this device is local-only. " +
                "This build does not claim server-verified hardware attestation.",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 12.dp),
        )
        Text(
            text = "SQLCipher database passphrase is Keystore-backed via EncryptedSharedPreferences. " +
                "adb pull + plain sqlite3 must fail without the passphrase.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 12.dp),
        )
        val notificationHonesty = when (sync.banner) {
            SyncBannerState.IDLE, SyncBannerState.SYNCED -> "No pending outbox — do not assume host was notified for offline captures until synced."
            SyncBannerState.QUEUED -> "Outbox queued (${sync.openCount}) — host notification pending sync."
            SyncBannerState.SYNCING -> "Outbox syncing (${sync.openCount})."
            SyncBannerState.FAILED -> "Outbox failed: ${sync.lastError ?: "unknown"} — host may not have been notified."
        }
        Text(notificationHonesty, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 12.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.padding(top = 24.dp)) { Text("Back") }
    }
}
