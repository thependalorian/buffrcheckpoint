package com.buffrcheckpoint.kiosk.roster.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.checkout.CheckOutViewModel
import com.buffrcheckpoint.kiosk.core.domain.RosterEntry
import com.buffrcheckpoint.kiosk.roster.RosterViewModel
import com.buffrcheckpoint.kiosk.sync.ui.SyncStatusBanner

@Composable
fun RosterScreen(
    onStartManualCheckIn: () -> Unit,
    onStartAssistedCheckIn: () -> Unit = onStartManualCheckIn,
    onStartQrCheckIn: () -> Unit = onStartManualCheckIn,
    onDevices: () -> Unit = {},
    onAbout: () -> Unit = {},
    rosterViewModel: RosterViewModel = hiltViewModel(),
    checkOutViewModel: CheckOutViewModel = hiltViewModel(),
) {
    val rosterState by rosterViewModel.uiState.collectAsState()
    val checkOutState by checkOutViewModel.uiState.collectAsState()

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = onStartManualCheckIn, text = { Text("New check-in") }, icon = {})
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            SyncStatusBanner()
            Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("On-site roster", style = MaterialTheme.typography.headlineMedium)
                Row {
                    Button(onClick = onDevices, modifier = Modifier.padding(end = 8.dp)) { Text("Devices") }
                    Button(onClick = onAbout, modifier = Modifier.padding(end = 8.dp)) { Text("About") }
                    Button(onClick = onStartQrCheckIn, modifier = Modifier.padding(end = 8.dp)) { Text("Scan QR") }
                    Button(onClick = onStartAssistedCheckIn, modifier = Modifier.padding(end = 8.dp)) { Text("Assisted") }
                    Button(onClick = rosterViewModel::refresh) { Text("Refresh") }
                }
            }

            checkOutState.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
            }
            checkOutState.lastCheckedOutVisitorName?.let { name ->
                Text(
                    "$name has been checked out.",
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            rosterState.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
            }

            if (rosterState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (rosterState.entries.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No one is currently checked in.", style = MaterialTheme.typography.bodyLarge)
                }
            } else {
                LazyColumn(modifier = Modifier.padding(top = 12.dp)) {
                    items(rosterState.entries, key = { it.visitId }) { entry ->
                        RosterRow(
                            entry = entry,
                            isCheckingOut = checkOutState.inFlightVisitId == entry.visitId,
                            onCheckOut = {
                                checkOutViewModel.checkOut(entry.visitId, entry.visitorDisplayName) {
                                    rosterViewModel.refresh()
                                }
                            },
                        )
                    }
                }
            }
            }
        }
    }
}

@Composable
private fun RosterRow(entry: RosterEntry, isCheckingOut: Boolean, onCheckOut: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(entry.visitorDisplayName, style = MaterialTheme.typography.titleLarge)
                Text("Host: ${entry.hostDisplayName} · ${entry.visitorTypeCode}", style = MaterialTheme.typography.bodyMedium)
                if (entry.offlineCaptured) {
                    Text("Pending sync", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
                }
            }
            if (entry.checkedOutAt == null) {
                Button(onClick = onCheckOut, enabled = !isCheckingOut) {
                    Text(if (isCheckingOut) "Checking out…" else "Check out")
                }
            } else {
                Text("Checked out", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
