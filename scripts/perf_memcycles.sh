#!/usr/bin/env bash
# TC-PERF-05: N add/delete cycles to observe memory behavior.
# Usage: perf_memcycles.sh <cycles> [udid]
# Each cycle: add an income through the real form (fixed adb taps, same
# coordinates as seed_transactions.sh), then delete it from Daftar (top-row
# delete affordance (767,1120) + confirm "Ya, hapus" (788,2161) — both
# captured live; the sheet window exposes no test tags on this build).
# Prints one line per cycle; caller captures `dumpsys meminfo` before/after.
set -euo pipefail

N="${1:?usage: perf_memcycles.sh <cycles> [udid]}"
UDID="${2:-emulator-5554}"

adb() { command adb -s "$UDID" "$@"; }

NAV_TAMBAH="212 2162"
NAV_DAFTAR="540 2162"
AMOUNT="540 500"
PAGER="540 848"
GAJI="563 1887"
SAVE="540 1514"
DELETE="767 1120"
CONFIRM="788 2161"

adb shell input tap $NAV_TAMBAH; sleep 1.2

for i in $(seq 1 "$N"); do
  # add
  adb shell input tap $AMOUNT; sleep 0.3
  adb shell input text "50$i"; sleep 0.3
  adb shell input keyevent 111; sleep 0.5
  adb shell input tap $PAGER; sleep 1.2
  adb shell input tap $GAJI; sleep 0.6
  adb shell input tap $SAVE; sleep 1.2
  # delete (list shows the new row on top)
  adb shell input tap $NAV_DAFTAR; sleep 1.2
  adb shell input tap $DELETE; sleep 0.8
  adb shell input tap $CONFIRM; sleep 1
  echo "cycle $i done"
done
echo "done: $N cycles"
