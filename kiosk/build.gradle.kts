plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    // Both must be declared in the same scope (dagger#3965 / Gradle classloaders).
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
