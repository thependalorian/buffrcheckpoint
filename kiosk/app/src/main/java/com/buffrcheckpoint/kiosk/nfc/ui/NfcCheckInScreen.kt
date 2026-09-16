package com.buffrcheckpoint.kiosk.nfc.ui

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.buffrcheckpoint.kiosk.nfc.NfcCheckInViewModel
import com.buffrcheckpoint.kiosk.nfc.NfcCredentialParser
import com.buffrcheckpoint.kiosk.nfc.NfcUiState

@Composable
fun NfcCheckInScreen(
    onSuccess: (visitId: String) -> Unit,
    onBack: () -> Unit,
    viewModel: NfcCheckInViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity

    DisposableEffect(activity) {
        val adapter = NfcAdapter.getDefaultAdapter(context)
        if (activity != null && adapter != null) {
            adapter.enableReaderMode(
                activity,
                { tag: Tag ->
                    val reference = NfcCredentialParser.parseReference(tag)
                    if (reference.isNullOrBlank()) {
                        viewModel.onUnreadableTag()
                    } else {
                        viewModel.onReferenceRead(reference)
                    }
                },
                NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_NFC_F or
                    NfcAdapter.FLAG_READER_NFC_V,
                null,
            )
        }
        onDispose {
            if (activity != null && adapter != null) {
                adapter.disableReaderMode(activity)
            }
        }
    }

    LaunchedEffect(state) {
        val success = state as? NfcUiState.Success ?: return@LaunchedEffect
        onSuccess(success.visitId)
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Tap NFC badge", style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        Text(
            text = "Hold the badge near the reader. Authentication uses the server-issued reference on the tag — never the tag UID alone.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp),
        )
        when (val s = state) {
            is NfcUiState.Waiting -> Text("Waiting for badge…", modifier = Modifier.padding(top = 24.dp))
            is NfcUiState.Validating, is NfcUiState.CheckingIn -> {
                CircularProgressIndicator(modifier = Modifier.padding(top = 24.dp))
                Text(
                    if (s is NfcUiState.Validating) "Validating credential…" else "Recording check-in…",
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
            is NfcUiState.Error -> {
                Text(s.message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 24.dp), textAlign = TextAlign.Center)
                Button(onClick = viewModel::reset, modifier = Modifier.padding(top = 16.dp)) { Text("Try again") }
            }
            is NfcUiState.Success -> Text("Checked in", modifier = Modifier.padding(top = 24.dp))
        }
        OutlinedButton(onClick = onBack, modifier = Modifier.padding(top = 24.dp)) { Text("Back") }
    }
}
