#!/usr/bin/env bash
# Seed N income transactions via fixed adb taps on the real Tambah form.
# Usage: scripts/seed_transactions.sh <count> [udid]
# Fixed taps (v2.2 layout; save at y=1514, NOT the stale 1557 — the button
# moved) because the uiautomator CLI can't do lookups while the appium
# uiautomator2 server holds the instrumentation. DEL keycodes clear the
# amount (input text appends); post-keyboard sleeps absorb the sheet shift.
set -euo pipefail

COUNT="${1:?usage: seed_transactions.sh <count> [udid]}"
UDID="${2:-emulator-5554}"
PKG="id.almezi.simplemoneytracker_kt"

adb() { command adb -s "$UDID" "$@"; }

TAP_NAV_TAMBAH="212 2162"
TAP_AMOUNT="540 500"
TAP_PAGER="540 848"
TAP_GAJI="563 1887"
TAP_SAVE="540 1514"

adb shell input tap $TAP_NAV_TAMBAH; sleep 1.5

for i in $(seq 1 "$COUNT"); do
  amt=$((1000 + i))
  adb shell input tap $TAP_AMOUNT; sleep 0.3
  for _ in 1 2 3 4 5 6 7 8; do adb shell input keyevent 67; done  # clear buffer
  adb shell input text "$amt"; sleep 0.4
  adb shell input keyevent 111; sleep 0.6                          # hide keyboard
  adb shell input tap $TAP_PAGER; sleep 1.2                          # sheet settles
  adb shell input tap $TAP_GAJI; sleep 0.6
  adb shell input tap $TAP_SAVE; sleep 0.7
  echo "seeded #$i (Rp $amt)"
done
echo "done: $COUNT transactions"
