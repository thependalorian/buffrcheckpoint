package com.buffrcheckpoint.kiosk.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun QrCodeImage(
    payload: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    sizePx: Int = 512,
) {
    var bitmap by remember(payload) { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(payload, sizePx) {
        bitmap = null
        if (payload.isNullOrBlank()) return@LaunchedEffect
        bitmap = withContext(Dispatchers.Default) {
            runCatching { encodeQrBitmap(payload, sizePx) }.getOrNull()
        }
    }

    bitmap?.let { qrBitmap ->
        Image(
            bitmap = qrBitmap.asImageBitmap(),
            contentDescription = contentDescription,
            modifier = modifier,
        )
    }
}

private fun encodeQrBitmap(payload: String, sizePx: Int): Bitmap {
    val hints = mapOf(
        EncodeHintType.MARGIN to 1,
        EncodeHintType.CHARACTER_SET to "UTF-8",
    )
    val matrix = QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
    val width = matrix.width
    val height = matrix.height
    val pixels = IntArray(width * height)
    for (y in 0 until height) {
        for (x in 0 until width) {
            pixels[y * width + x] = if (matrix[x, y]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt()
        }
    }
    return Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)
}
