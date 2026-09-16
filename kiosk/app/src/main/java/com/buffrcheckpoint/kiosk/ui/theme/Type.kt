package com.buffrcheckpoint.kiosk.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

// Kiosk is used at arm's length on a mounted tablet — sizes lean larger than
// a typical phone-app Typography for readability from a standing distance.
val BuffrTypography = Typography(
    displaySmall = TextStyle(fontSize = 32.sp),
    headlineLarge = TextStyle(fontSize = 34.sp),
    headlineMedium = TextStyle(fontSize = 28.sp),
    titleLarge = TextStyle(fontSize = 24.sp),
    titleMedium = TextStyle(fontSize = 20.sp),
    bodyLarge = TextStyle(fontSize = 18.sp),
    bodyMedium = TextStyle(fontSize = 16.sp),
    labelLarge = TextStyle(fontSize = 18.sp),
)
