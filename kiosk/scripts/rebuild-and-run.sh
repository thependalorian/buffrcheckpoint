#!/bin/zsh
set -euo pipefail
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="${HOME}/Library/Android/sdk"
export PATH="${JAVA_HOME}/bin:${ANDROID_HOME}/platform-tools:${PATH}"
cd /Users/georgenekwaya/Downloads/ai-agent-mastery-main/buffrcheckpoint/kiosk
./gradlew :app:assembleDebug :app:installDebug --no-daemon
adb -s emulator-5554 shell am start -n com.buffrcheckpoint.kiosk/.MainActivity
open -a "Android Studio" /Users/georgenekwaya/Downloads/ai-agent-mastery-main/buffrcheckpoint/kiosk || true
echo "DONE" | tee /tmp/bc-kiosk-rebuild.status
