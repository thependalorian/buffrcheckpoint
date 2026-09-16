package com.buffrcheckpoint.kiosk.devices.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.devices.DeviceListViewModel

@Composable
fun DeviceListScreen(
    onBack: () -> Unit,
    viewModel: DeviceListViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Devices (read-only)", style = MaterialTheme.typography.headlineMedium)
        Text(
            "This kiosk cannot activate or retire devices. Use admin for lifecycle changes.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
        )
        OutlinedButton(onClick = onBack) { Text("Back") }
        if (state.isLoading) {
            CircularProgressIndicator(modifier = Modifier.padding(top = 24.dp).align(Alignment.CenterHorizontally))
        } else if (state.errorMessage != null) {
            Text(state.errorMessage!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 16.dp))
        } else {
            LazyColumn(modifier = Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.devices, key = { it.id }) { device ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("${device.manufacturer} ${device.model}", style = MaterialTheme.typography.titleMedium)
                            Text("Serial: ${device.serialNumber}", style = MaterialTheme.typography.bodySmall)
                            Text("CRAN: ${device.cranComplianceStatusCode}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}
