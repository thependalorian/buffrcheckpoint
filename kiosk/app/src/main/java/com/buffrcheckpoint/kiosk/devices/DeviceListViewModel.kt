package com.buffrcheckpoint.kiosk.devices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.DeviceResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DeviceListUiState(
    val isLoading: Boolean = false,
    val devices: List<DeviceResponse> = emptyList(),
    val errorMessage: String? = null,
)

@HiltViewModel
class DeviceListViewModel @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(DeviceListUiState())
    val uiState: StateFlow<DeviceListUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            try {
                val devices = apiServiceProvider.get().listDevices()
                _uiState.value = DeviceListUiState(isLoading = false, devices = devices)
            } catch (e: Exception) {
                _uiState.value = DeviceListUiState(
                    isLoading = false,
                    errorMessage = e.message ?: "Could not load devices",
                )
            }
        }
    }
}
