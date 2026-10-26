#!/usr/bin/env bash
# Measure UI transition latency by polling screenshots for a visible change.
# Usage: perf_measure.sh tap <x> <y> [udid]
# Prints the elapsed ms between the tap and the first changed frame. The
# screencap poll interval (~100-200ms on the emulator) is INCLUDED in the
# printed number, so it is an upper bound: if it prints < threshold the
# transition is guaranteed under threshold.
set -euo pipefail
X="${1:?usage: perf_measure.sh tap <x> <y> [udid]}"
Y="${2:?}"
UDID="${3:-emulator-5554}"
PKG="id.almezi.simplemoneytracker_kt"

adb() { command adb -s "$UDID" "$@"; }

frame_hash() {
  adb exec-out screencap -p | md5
}

# pre-frame (two samples: the UI may be mid-settle)
H0=$(frame_hash); sleep 0.35; H0=$(frame_hash)

T0=$(date +%s%N)
adb shell input tap "$X" "$Y"
for _ in $(seq 1 40); do
  H=$(frame_hash)
  if [ "$H" != "$H0" ]; then
    T1=$(date +%s%N)
    echo $(( (T1 - T0) / 1000000 ))
    exit 0
  fi
  sleep 0.12
done
echo "timeout"
exit 1
