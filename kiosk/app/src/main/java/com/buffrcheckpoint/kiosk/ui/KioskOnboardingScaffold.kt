package com.buffrcheckpoint.kiosk.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KioskOnboardingScaffold(
    title: String,
    showBack: Boolean = false,
    onBack: (() -> Unit)? = null,
    content: @Composable (PaddingValues) -> Unit,
) {
    if (showBack && onBack != null) {
        BackHandler(onBack = onBack)
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(title) })
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (showBack && onBack != null) {
                TextButton(onClick = onBack, modifier = Modifier.padding(start = 8.dp)) {
                    Text("Back", style = MaterialTheme.typography.labelLarge)
                }
            }
            content(padding)
        }
    }
}
