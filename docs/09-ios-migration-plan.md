# 9. iOS Migration Plan

Purpose: turn Saku into a dual-platform (Android + iOS) app using Kotlin
Multiplatform and Compose Multiplatform, and give you an executable to-do list.

**Nothing in this document has been implemented yet.** This is a plan.

Written 2026-10-12 against branch `feature/improve-design-2.0`, HEAD `8c7dc3a`.
External versions verified against JetBrains and Google documentation on
2026-10-12.

---

## How to use this document

- **§1–§2** — read before deciding anything.
- **§3** — the master to-do list. Copy the checkboxes into your task tracker.
- **§4–§10** — step-by-step implementation, one section per stage. Each stage
  ends with a verification command and a "done when" gate.
- **§11** — risks and unknowns.

Do the stages in order. Do not start Stage 2 before Stage 1 passes its gate.

---

## 1. The headline

**The blocker `TESTABILITY.md` flagged is resolved.**

`TESTABILITY.md` lists under "Verified on":

> iOS: __ (Stage 0: do Compose test tags surface as accessibility IDs?)

JetBrains documents this explicitly:

> "You can also use this semantic data in testing and other automation:
> properties such as `testTag` will correctly map to native accessibility
> properties such as `accessibilityIdentifier`. This makes semantic data from
> Compose Multiplatform available to Accessibility Services and XCTest
> framework."

So the ~110 tags in `TestTags.kt` carry over to iOS unchanged, and Appium's
`accessibilityId` locator will work. That is the single biggest risk-reducer in
this whole plan, and it means your existing automation investment is not wasted
work.

**Caveat:** there is an open JetBrains issue, **CMP-9551** — a `testTag` applied
to a *container* may surface on a synthetic child accessibility node rather than
the container element. Your screens tag the **root `Box`/`Column`** of each
screen (`TAMBAH_SCREEN`, `DAFTAR_SCREEN`, `CADANGAN_SCREEN`, and the rest).
Verify this in Stage 1 before building anything on top of it.

---

## 2. What you're actually up against

### 2.1 Coupling measured in your codebase

I measured it rather than assuming:

| Metric | Count |
|---|---|
| Kotlin files in `app/src/main/java` | 62 |
| Total Kotlin LOC | 6,626 |
| Files importing `android.*` | **7** |
| Distinct `android.*` APIs used | **6** |
| `R.string.*` references | **191** (163 distinct) |
| `stringResource()` calls | **138** |
| `R.array.*` references | 3 |
| `R.font.*` references | 6 |

The six Android APIs, exhaustively:

| API | Used in | Why it's a problem |
|---|---|---|
| `android.content.Context` | `AppContainer`, `CadanganViewModel`, `SakuFormat` (×6 fns), `TransactionForm` | No iOS equivalent |
| `android.app.Application` | `SimpleMoneyTrackerApp` | No iOS equivalent |
| `android.os.Bundle` | `MainActivity` | Replaced by the CMP entry point |
| `android.os.SystemClock` | `MainActivity` | Use `kotlin.time.TimeSource` |
| `android.net.Uri` | `BackupRepository`, `CadanganViewModel` | iOS uses `NSURL` |
| `android.app.DatePickerDialog` | `TransactionForm` | Use CMP Material3 `DatePicker` |

**This is unusually clean.** Seven files of 62. The MVVM + Repository
architecture did its job — there is no Android framework leaking into the
domain layer.

### 2.2 The four real blockers

**Blocker 1 — The application ID is invalid on iOS.**

`id.almezi.simplemoneytracker_kt` contains underscores. iOS bundle identifiers
permit only alphanumerics, hyphens, and periods. **App Store Connect rejects
underscores.** You will need something like `id.almezi.saku`.

Changing the Android `applicationId` after publishing would create a *different*
app in Play. Decide this before any release work, not after.

**Blocker 2 — String resources do not cross the platform boundary.**

163 distinct strings, 3 string arrays, 6 bundled fonts. Android XML resources
have no iOS equivalent, and Compose Multiplatform does not read `res/values/`.

This forces a decision that contradicts `AGENTS.md` ("Strings in resource
files, no hard-coded UI text"). You must amend `AGENTS.md`. Options:

| Option | Effort | Keeps AGENTS.md rule? |
|---|---|---|
| `org.jetbrains.compose.resources` | Medium | Partially — files, not XML |
| Kotlin constants in `commonMain` | Low | **No** — requires amending |
| Keep Android XML + add an iOS set | Low upfront, high ongoing | Yes, but two sources of truth |

Recommendation: `compose.resources`. It keeps strings in files, keeps
Indonesian copy reviewable, and is the JetBrains-blessed path.

**Blocker 3 — Compose jumps six major versions.**

Your Compose BOM is `2024.02.00` (≈Compose 1.6). Compose Multiplatform 1.12.1
ships **Jetpack Compose 1.12.1**. Expect breaking changes in `Material3`,
resource APIs, and the experimental annotations your code depends on.

Good news: CMP 1.12.1 requires Kotlin ≥ 2.1.0, and you are on **2.4.20**. No
Kotlin bump needed. The Compose compiler plugin version must equal the Kotlin
plugin version — `libs.plugins.kotlin.compose` is already `2.4.20`, so that
rule is already satisfied.

**Blocker 4 — Navigation and persistence must be rewritten, not adapted.**

- `androidx.navigation:navigation-compose:2.7.7` is **Android-only**. JetBrains'
  CMP navigation uses a different route DSL (typed `NavDestination` objects,
  not string routes). `navigation/NavGraph.kt` is rewritten.
- AndroidX Room 2.8.4 → **Room 3.x with new artifact coordinates**
  (`androidx.room3:room3-runtime`, plugin `androidx.room3`). Two APIs you rely
  on change shape:
  - `Migration.migrate(db: SupportSQLiteDatabase)` → `migrate(connection: SQLiteConnection)`
  - `RoomDatabase.withTransaction { }` → `useWriterConnection { it.immediateTransaction { } }`

  You have both of those in `data/AppDatabase.kt`.

---

## 3. Master to-do list

Copy this into your task tracker. 48 items across 6 stages.

### Stage 1 — Spike (validate before committing) · ~2–3 days

- [ ] 1.1 Install Xcode 16+ and confirm an iOS 14+ simulator or device builds a hello-world CMP app — ⚠️ **Xcode 27.0 installed but `xcode-select` points at CommandLineTools, so `xcodebuild`/`xcrun` fail.** iOS 27.0 runtime and 12 simulator devices ARE already present. Run `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`. No runtime download needed. See §4.1
- [x] 1.2 Confirm your Mac is Apple Silicon (`uname -m` → `arm64`); CMP 1.12.1 is 64-bit only — ✅ **verified 2026-10-12: `arm64`, Apple M5, macOS 27.0.1**
- [ ] 1.3 Create a throwaway CMP 1.12.1 module (`kmp.jetbrains.com` wizard) alongside the repo — do **not** convert `app/` yet — ✅ **prereqs verified**: 290 GB free, all repos reachable, Gradle 9.7.1 + JDK 25, Android baseline builds and its 26 tests pass
- [x] 1.4 Add 5 real test tags to that spike's UI — ✅ done, using Saku's real tag strings (`tambah_screen`, `tambah_input_amount`, `tambah_button_save`, `daftar_list`, `daftar_item`)
- [x] 1.5 Verify each tag surfaces as an `accessibilityIdentifier` — ✅ **all five FOUND**
- [x] 1.6 **Verify CMP-9551** — ✅ **did not reproduce**. `tambah_screen` on the root `Box` resolves as a normal `AccessibilityElement`. Screen-level tags are safe
- [ ] 1.7 Verify Appium `accessibilityId` can locate those elements on the simulator
- [x] 1.8 Record the result in `TESTABILITY.md` "Verified on" — ✅ done, plus four cautions for the suite
- [x] 1.9 **GATE** — ✅ **PASSED 2026-10-12**. Root-container tags surface correctly; no change to `TestTags.kt` needed. Proceed to Stage 2

### Stage 2 — Build restructure · ~1–2 weeks

- [x] 2.1 Branch — ✅ `feature/ios-migration` created
- [x] 2.2 Application ID — ✅ **not blocking.** Android and iOS bundle IDs are independent, so `id.almezi.simplemoneytracker_kt` stays on Android (no Play risk) and iOS picks its own at Stage 6. Only the internal Kotlin package is shared, and it is unchanged
- [x] 2.3 KMP module `composeApp/` created — ✅ `app/` stays the Android application and depends on it
- [x] 2.4 Plugins applied — ✅ but `org.jetbrains.compose` is ALSO required (see 5.5.1)
- [x] 2.5 Targets declared — ✅ Android uses `android { }` inside `kotlin {}`, not `androidTarget()`
- [x] 2.6 Framework configured (`baseName = "ComposeApp"`, `isStatic = true`)
- [x] 2.7 Moved 15 files to `commonMain`. `BackupRepository` deliberately stayed in `app/` (Stage 5)
- [x] 2.8 Added — ✅ also needs `import androidx.room3.RoomDatabaseConstructor`
- [x] 2.9 Converted — ✅ `migrate` must be **suspend** in Room 3
- [x] 2.10 Converted — ✅ both helpers need explicit `androidx.room3.*` imports
- [x] 2.11 `androidMain` builder written
- [x] 2.12 `iosMain` builder written. `Dispatchers.IO` does not exist on Native
- [x] 2.13 Added — ✅ `androidx.sqlite:sqlite-bundled:2.7.1`
- [x] 2.14 All three KSP targets registered
- [x] 2.15 Room plugin enabled — ✅ but the DSL is `room3 { }`, not `room { }`
- [x] 2.16 Done without expect/actual — plain platform-specific factories are simpler here
- [x] 2.17 **GATE — ✅ PASSED.** Both iOS targets compile, `:app:assembleDebug` succeeds, all 26 unit tests pass

### Stage 3 — Resources · ✅ complete (via a workaround, not the planned route)

The §6.5 blocker is **real and still true**: Compose Multiplatform does not generate working resource accessors for the Android target. This stage was completed anyway, by abandoning CMP resource accessors for strings.

- [x] 3.1 Add `compose.resources` dependency — ⚠️ added, but **only iosMain may consume it.** `androidMain` must not, or every accessor fails to resolve (§6.5)
- [x] 3.2 Convert `strings.xml` → **not done, and deliberately abandoned.** The single source of truth moved to `composeApp/shared-strings/strings.xml`
- [x] 3.3 Convert string arrays — ✅ done, but via the same generator rather than CMP resource arrays. `days_short`, `months_short`, `months_long` now emit as Kotlin lists
- [x] 3.4 Copy the 6 TTFs into `composeResources/font/` — ✅ done, **but they exist in two places.** See §6.6
- [x] 3.5 Update all `stringResource()` call sites — ✅ done, and `commonMain` now contains **zero** `stringResource()` calls
- [x] 3.6 Update `R.font.*` → `Res.font.*` — ⚠️ **reversed on purpose.** `iosMain` uses `Res.font.*`; `androidMain` uses `R.font.*` from its own `res/font/`. See §6.6
- [x] 3.7 Update `SakuFormat.kt` — ✅ made Context-free. It no longer calls `getStringArray()`
- [x] 3.8 Update `CategoryUiMapper.kt` — ✅ signature changed from `Int` to `String`
- [x] 3.9 AndroidManifest app label — ⬜ not needed; the label stays in the Android manifest, which is platform-correct
- [x] 3.10 Amend `AGENTS.md` for the new string rule — ✅ done; it now documents `SakuStrings.<name>` and that the generated file must never be edited
- [x] 3.11 **GATE** — ✅ **PASSED.** All 165 strings and 3 arrays resolve from `SakuStrings` in commonMain; `compileAndroidMain` and `compileKotlinIosSimulatorArm64` both succeed

**What replaced the planned route:** a Gradle task (`:composeApp:generateSakuStrings`) parses `composeApp/shared-strings/strings.xml` and emits `SakuStrings.kt` into a generated source dir wired into `commonMain`. One XML file remains the single source of truth; code reads `SakuStrings.tambah_simpan`. Cost: no runtime locale switching. Benefit: no codegen dependency, and Android cannot break again. Full rationale and the failed alternatives are in §6.5.

### Stage 4 — UI · ✅ complete except the iOS run

- [x] 4.1 Move `ui/` to `commonMain` — ✅ all 9 screens, design system, components, navigation, `TestTags`. 64 files in `commonMain`
- [x] 4.2 Resolve Compose breaking changes — ✅ no change needed; `androidLibrary { }` keeps the resolved Compose version
- [x] 4.3 Swap `androidx.navigation` → CMP navigation — ✅ `org.jetbrains.androidx.navigation:navigation-compose:2.9.0-beta02`, exposed as `api`
- [x] 4.4 Rewrite `NavGraph.kt` for typed routes — ✅ `@Serializable` `Screen` objects replace string templates; `SakuNavItem` became generic so test tags are unchanged
- [x] 4.5 Replace `android.app.DatePickerDialog` — ✅ `SakuDatePicker.kt` uses the CMP Material3 `DatePickerDialog`
- [x] 4.6 Re-implement the future-date restriction — ✅ via `SelectableDates`. Timezone is handled explicitly: the picker works in UTC while Saku stores midnight Asia/Jakarta, so the selected UTC date is re-anchored to Jakarta
- [x] 4.7 `SystemClock.elapsedRealtime()` → `TimeSource.Monotonic` — ✅ in `SakuApp.kt`
- [x] 4.8 Loading-screen logic to common — ✅ in `SakuApp.kt`
- [x] 4.9 `MainActivity` reduced to a thin entry point — ✅ it now only supplies the container, the ready flag, and the Android-only backup screen
- [x] 4.10 iOS entry point — ✅ `composeApp/src/iosMain/.../MainViewController.kt`; `ComposeApp.framework` exports `MainViewController()` to Swift
- [ ] 4.11 Create the Xcode project — ❌ **NOT DONE.** There is **no `.xcodeproj` in the repo.** `iosApp/` currently holds a hand-built harness instead (`SakuApp.swift`, `build-app.sh`, `run-app.sh`). See §6.7
- [ ] 4.12 iOS app icon asset catalog — ⬜ blocked behind 4.11
- [x] 4.13 Port `TestTags.kt` to common — ✅ **no tag string changed.** 108 constants intact
- [ ] 4.14 **GATE: all 9 screens render on both Android and iOS Simulator** — ❌ **NOT PASSED.** Android compiles and tests green; **iOS has never rendered this code.** Two blockers remain: `xcode-select` (§4.1) and `compose-resources` packaging (§6.7)

**Consequence:** because 4.14 never passed, Stage 5 cannot start as written. There is no running iOS app to port platform I/O onto.

### Stage 5 — Platform I/O · ~3–5 days

- [ ] 5.1 Abstract the document picker behind expect/actual (SAF on Android, `UIDocumentPickerViewController` on iOS)
- [ ] 5.2 Abstract the export share sheet (add `FileProvider` on Android, `UIActivityViewController` on iOS)
- [ ] 5.3 Abstract the preferences store (replace `SharedPreferences("saku_backup")`)
- [ ] 5.4 Abstract file write paths (`getExternalFilesDir` → iOS documents directory)
- [ ] 5.5 Confirm the import duplicate-detection rule behaves identically on both
- [ ] 5.6 Verify CSV/JSON round-trip on iOS produces byte-identical output to Android
- [ ] 5.7 **GATE: export → import round-trip verified on iOS**

### Stage 6 — Shipping · ~1–2 weeks

- [ ] 6.1 Run the full `UI_SPEC.md` §6 QA checklist on **both** platforms
- [ ] 6.2 Verify all ~110 test tags resolve on iOS via Appium
- [ ] 6.3 Create an Apple Developer account ($99/yr) if not held
- [ ] 6.4 Create the App Store Connect record
- [ ] 6.5 Generate an Apple Distribution certificate + provisioning profile
- [ ] 6.6 Configure the release build in Xcode (Release config, bitcode off)
- [ ] 6.7 Produce an App Store–signed build via Xcode Archive
- [ ] 6.8 Upload to TestFlight
- [ ] 6.9 Smoke-test the TestFlight install on a real iPhone
- [ ] 6.10 Fill the App Privacy questionnaire — **no data collected, no data shared, on-device only**
- [ ] 6.11 Submit for App Review
- [ ] 6.12 Update `docs/`, `UI_SPEC.md`, `AGENTS.md`, and `TESTABILITY.md` to reflect dual-platform reality

**Rough total: 4–6 weeks** for one experienced developer.

---

## 4. Stage 1 — The spike (do this before anything else)

The entire migration's viability rests on one question. Spend 2–3 days
answering it.

### 4.1 Pre-flight check — results on the maintainer's machine (2026-10-12)

I ran the machine checks in the to-do list. Results:

| Item | Result |
|---|---|
| 1.1 Xcode 16+ | ⚠️ **Xcode 27.0 installed at `/Applications/Xcode.app`, but not activated.** `xcode-select -p` returns `/Library/Developer/CommandLineTools`, so both `xcodebuild` and `xcrun simctl` fail |
| 1.1 iOS SDK | ✅ `iPhoneOS27.0.sdk` ships inside the installed Xcode |
| 1.1 Simulator runtimes | ✅ **iOS 27.0 runtime IS installed**, with 12 devices (iPhone 18 Pro / Pro Max / 17 / 17e / Air, iPad Pro 13" and 11", iPad Air 13" and 11", iPad mini A17 Pro, iPad A16). 130 device types available. **No runtime download needed** |
| 1.2 Apple Silicon | ✅ **PASS** — `arm64`, Apple M5, macOS 27.0.1 |
| 1.3 Disk | ✅ 290 GB free — ample for Kotlin/Native multi-GB downloads |
| 1.3 Network | ✅ Maven Central `200`, Kotlin Native `302` (redirect), JetBrains space `301` |
| 1.3 Gradle / JDK | ✅ Gradle 9.7.1, JDK 25.0.4 Temurin |
| 1.3 Android baseline | ✅ `:app:assembleDebug` succeeds → 21.4 MB APK |
| 1.3 Baseline tests | ✅ 4 classes, 26 tests, all pass |
| 1.3 CocoaPods | ✅ **Not needed — not installed, and not required.** The CMP wizard uses *direct integration* (`embedAndSignAppleFrameworkForXcode`), which is mutually exclusive with CocoaPods. See §4.1.1 |

**One action is required before anything else in Stage 1 can run:**

```bash
# Point xcode-select at the full Xcode
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

That is the whole fix. **Do not download a simulator runtime** — one is already
installed. Simulator devices under `~/Library/Developer/CoreSimulator/Devices`
have recent activity, so Xcode has been launched and licensed on this machine
already.

Verify:

```bash
xcodebuild -version         # must report Xcode 27.x, not the CommandLineTools error
xcrun simctl list runtimes  # must list iOS 27.0
xcrun simctl list devices   # must list ~12 iOS 27.0 devices
```

> ### ⚠️ Correction (2026-10-12)
>
> An earlier version of this document claimed **no simulator runtimes were
> installed**, based on `~/Library/Developer/CoreSimulator/Profiles/Runtimes`
> not existing. That was wrong.
>
> `~/Library/Developer/CoreSimulator/Profiles/` is the *legacy* runtime
> location. Xcode 15+ registers runtimes elsewhere, and on this machine the
> live data is in `/Library/Developer/CoreSimulator/Images/images.plist`.
>
> The real problem was only that `xcrun` was resolving to CommandLineTools.
> Calling the bundled binary directly proved the runtime was there all along:
>
> ```bash
> /Applications/Xcode.app/Contents/Developer/usr/bin/simctl list runtimes
> # == Runtimes ==
> # iOS 27.0 (27.0 - 24A434) - com.apple.CoreSimulator.SimRuntime.iOS-27-0
> ```
>
> **Lesson for Stage 1 checks:** when `xcrun` fails, do not conclude a resource
> is missing. Call the tool directly from the Xcode bundle before reporting it
> absent.

Items 1.5 and 1.7 (XCTest and Appium verification) cannot run until
`xcode-select` is switched.

### 4.1.1 CocoaPods is not needed

An earlier draft of this document flagged CocoaPods as a possible gap. **It is
not required for this project.**

JetBrains states the two integration approaches are mutually exclusive:

> "The CocoaPods integration approach can't be used together with the
> `embedAndSignAppleFrameworkForXcode` mechanism used for direct integration."

| Approach | CocoaPods required? |
|---|---|
| **Direct integration** — the default from the `kmp.jetbrains.com` wizard | ❌ No |
| CocoaPods distribution | ✅ Yes |

The Stage 1 spike and the whole migration use **direct integration**: Gradle
builds the Kotlin framework, and Xcode links it through a build phase. There is
no `Podfile` and no `pod install` step.

This is consistent with JetBrains issue **KT-85113**, where adding the
CocoaPods plugin to a Compose Multiplatform project *causes* the iOS build to
fail with `'embedAndSign' task can not be used in a project with …`.

You would need CocoaPods only if you adopted a third-party iOS SDK distributed
as a pod — Firebase, a barcode scanner, a payments SDK. Saku has none: no
analytics, no crash reporting, no payments, no camera. Every Android API it uses
has a Kotlin/Native equivalent.

Verified: the repository contains no `Podfile`, no `Podfile.lock`, no
`.podspec`, no `Pods/` directory, and no CocoaPods reference in any `.kts`,
`.toml`, or `.properties` file.

### 4.2 Build the spike

> ### ✅ STAGE 1 RESULT — GATE PASSED (2026-10-12)
>
> The spike was built and run. **All five tag patterns resolved, including the
> root container.** The migration's central question is answered: it is
> viable, and the existing test-tag contract carries over to iOS unchanged.
>
> | Item | Result |
> |---|---|
> | 1.1 Xcode + simulator | ✅ Xcode 27.0, iOS 27.0 runtime, 12 devices, `iPhone 18 Pro` used |
> | 1.2 Apple Silicon | ✅ `arm64`, Apple M5 |
> | 1.3 CMP module | ✅ CMP 1.12.1 + Kotlin 2.4.20, static framework built (3m 14s) |
> | 1.4 Five tags added | ✅ using Saku's **real** tag strings |
> | 1.5 accessibilityIdentifier | ✅ all five FOUND |
> | 1.6 CMP-9551 | ✅ **Did not reproduce** — root container tag resolves correctly |
> | 1.7 Appium `accessibilityId` | ⏭️ Not run; the underlying `accessibilityIdentifier` is confirmed present, which is what Appium reads |
> | 1.8 Record in `TESTABILITY.md` | ✅ Done |
> | 1.9 GATE | ✅ **PASSED** |
>
> Result recorded in `TESTABILITY.md` under "Verified on".

#### Three build problems found that the plan did not anticipate

These would each have cost time during Stage 2. They are now known.

**1. AGP 9.0 forbids `com.android.application` + KMP in one module.** This
invalidates the module structure in §5.2.

```
> Failed to apply plugin 'com.android.internal.application'.
   > The 'com.android.library' (or 'com.android.application') plugin is not
     compatible with the 'org.jetbrains.kotlin.multiplatform' plugin since AGP 9.0.
```

Google's guidance:

> "There isn't a direct replacement for configuring a Kotlin Multiplatform module
> using `com.android.application` plugin. To migrate, **extract your Android
> application to a separate Gradle module**."

So the correct structure is three modules, not two:

```
composeApp/   ← KMP library: com.android.kotlin.multiplatform.library + iOS targets
androidApp/   ← thin com.android.application module, depends on composeApp
iosApp/       ← Xcode project, links the static framework
```

The KMP module also loses build types and product flavors (single-variant
architecture). Saku has `buildTypes.release { optimization.enable = false }`,
which must live in `androidApp/` instead. **`BuildConfig` is also gone** — it
is not generated by the new plugin, which matters for the debug-only hooks in
§1.10 of document 01.

**2. The Kotlin/Native runtime requires iOS 15.0, not 14.0.** The linker warns:

```
object file (libkotlin.-oplz3m.a.o) was built for newer 'iOS-simulator'
version (15.0) than being linked (14.0)
```

CMP 1.12.1 documents an iOS 14 floor, but Kotlin 2.4.20's native runtime
targets 15.0. **Use a deployment target of iOS 15.0.** Update §9.1 accordingly.

**3. Two iOS launch-time requirements that crash the app with unhelpful errors.**

| Symptom | Cause | Fix |
|---|---|---|
| `Application failed to launch: UIScene life cycle is required for apps built with this SDK` | No scene delegate | Add `UIApplicationSceneManifest` to Info.plist **and** a `UIWindowSceneDelegate`. The legacy `UIApplicationDelegate.window` pattern is rejected on the iOS 27 SDK |
| `IllegalStateException: Info.plist doesn't have a valid CADisableMinimumFrameDurationOnPhone entry` from `PlistSanityCheck` | CMP performance gate | Add `<key>CADisableMinimumFrameDurationOnPhone</key><true/>` to Info.plist. CMP throws this the moment `ComposeUIViewController` is created |

The scene delegate's class name in Info.plist did **not** resolve for a
hand-built bundle; registering it programmatically via
`application(_:configurationForConnecting:options:)` returning a
`UISceneConfiguration` with `delegateClass` set works reliably.

#### Spikes are self-contained

The Stage 1 spike was a throwaway directory with its own `settings.gradle.kts`,
so it was never part of the Saku build. **It has been deleted** (518 MB, 29
files tracked in git). Its findings survive in this document and in
`TESTABILITY.md`; only the code was redundant.

What replaced it in `iosApp/` is a hand-built harness for the **real** module —
see §6.7 for why a `.xcodeproj` is still required.

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer   # see §4.1
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64         # build the framework
./iosApp/build-app.sh                                            # compile + bundle
./iosApp/run-app.sh "iPhone 18 Pro"                              # boot, install, run, screenshot
```

| Path | What it is |
|---|---|
| `iosApp/SakuApp.swift` | Swift host. `@main` AppDelegate + SceneDelegate, calls `MainViewControllerKt.MainViewController()` |
| `iosApp/Info.plist` | Bundle config. `id.almezi.saku`, iOS 15.0 min |
| `iosApp/build-app.sh` | Compiles the Swift host against the framework and assembles a `.app` |
| `iosApp/run-app.sh` | Boots a simulator, installs, launches, screenshots |

> **This harness is a stopgap, not the destination.** It compiles Swift with
> `swiftc` directly and hand-copies `compose-resources`, because no
> `.xcodeproj` exists yet. See §6.7. Treat `iosApp/` as scaffolding to be
> replaced by a real Xcode project, not as the shipping iOS app.

### 4.3 Stage 1.5 — real Saku design system on iOS

Stage 1 proved the tags work. Stage 1.5 asked the harder question: **does Saku
actually look right on iOS?**

The real `ui/designsystem/` was copied into the spike's `commonMain`
(`SakuColor.kt`, `SakuDimens.kt`, `SakuType.kt`, the 6 bundled DM fonts) along
with the real `TransactionCard`, `CategoryAvatar`, buttons, and a
reconstruction of the Transaksi/Daftar screen. Result on iPhone 18 Pro,
iOS 27.0 — see `docs/screenshots/saku-ios-real.png`.

**It works.** DM Sans and DM Mono render correctly with tabular figures, all
colour tokens resolve, all 18 text styles resolve, `formatRupiah` produces
`Rp 7.000.000`, and every real test tag surfaces as an
`accessibilityIdentifier`:

```
FOUND daftar_screen                              screen root container
FOUND daftar_list                                transaction lazy list
FOUND component_nav_bottom                       floating bottom nav
FOUND component_card_transaction_inc_salary      TransactionCard
FOUND component_card_transaction_edit_inc_salary row Ubah action
FOUND component_card_transaction_delete_...      row Hapus action
FOUND component_card_transaction_exp_daily_food  TransactionCard: Makanan
FOUND component_card_transaction_inc_freelance   TransactionCard: Freelance
FOUND avatar_inc_salary                          CategoryAvatar
```

#### Five changes the design system required

These are not optional polish. Each one breaks compilation or the app at
runtime if missed.

| # | Change | Symptom if skipped |
|---|---|---|
| 1 | **Font families and every `SakuTextStyles` entry must become `@Composable get()`** | `Font(Res.font.x, weight)` is composable-only in CMP. Compile error: "@Composable invocations can only happen from the context of a @Composable function". ~40 edits across `SakuType.kt` |
| 2 | **`Font` must be imported from `org.jetbrains.compose.resources`, not `androidx.compose.ui.text.font`** | Type mismatch: `FontResource` vs `Int` |
| 3 | **`compose-resources/` must be bundled at the app root** | Runtime crash on first composition: `MissingResourceException`. Normally an Xcode build phase copies it in; a hand-built bundle does not |
| 4 | **`SakuFormat` functions must stop taking `Context`** | Six functions read month/day arrays via `Context.resources`. Confirmed mandatory, not stylistic — see the refactor in §6.3 |
| 5 | **`Res` is generated into the configured package** | `compose.resources { publicResClass = true; packageOfResClass = "saku" }`, then use `Res.string.*` with **no import** when already in that package |

Also: `androidx.compose.ui.res.stringResource` does not exist for Compose
resources. Use `org.jetbrains.compose.resources.stringResource`, and note that
`getStringArray(...)` is **suspend** — string arrays cannot be read in a plain
composable and need an effect.

#### Two visual issues found — only one was real

**Amount text wrapping — WAS a spike bug, now fixed.** `Rp 7.000.000` wrapped
onto two lines in the summary tiles. The cause was my reproduction using
`amountMedium` (24 sp) with no `maxLines`. The real `DaftarScreen.kt:215`
already does it correctly with `amountSmall` (16 sp) **and `maxLines = 1`**.
**Saku's Android code is right; no change is needed there.** Worth keeping in
mind anyway: iOS font metrics differ slightly from Android's, so any amount
rendered at a large size in a constrained container should carry `maxLines = 1`.

**Bottom nav overlapping the last card — NOT a bug.** The real screen uses the
same `SakuSize.navReserve` bottom padding (`DaftarScreen.kt:285`). A floating
nav is *meant* to overlay content that scrolls beneath it. No change needed.

#### What this changes about the plan

The migration's hard part is **not** the design system — it ports cleanly. The
hard parts remain exactly where §6 and §7 say: the 191 string-resource call
sites, the navigation rewrite, and Room KMP. Add to Stage 4:

- [ ] Convert all of `SakuType.kt` to `@Composable get()`
- [ ] Add the `compose-resources` copy step to the Xcode build phase
- [ ] Audit every amount `Text` for `maxLines = 1` on iOS
- [ ] Replace every `statusBarsPadding()` with a cross-platform inset

### 4.3 What the spike cost, realistically

~45 minutes of wall time plus a 3-minute first Kotlin/Native link. The four
failures above were all configuration or syntax, not architectural. That is
encouraging for Stage 2 — but the spike deliberately omitted Room, strings,
and navigation, which are the genuinely expensive parts.

```bash
# 1. Confirm Apple Silicon — CMP 1.12.1 is 64-bit only, iosX64 was dropped
uname -m          # must print: arm64

# 2. Generate a throwaway project (do NOT touch app/)
#    https://kmp.jetbrains.com → Compose Multiplatform → Android + iOS

# 3. Build it
./gradlew :composeApp:assembleDebug
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
open iosApp/iosApp.xcodeproj   # ← ⚠️ NEVER BUILT. See §6.7; this path does not exist.
```

> **Correction (2026-10-16):** the last line above is aspirational. The spike
> never got an `.xcodeproj`, and neither has the real module. What exists is the
> hand-built harness described in §4.1 — `./iosApp/build-app.sh` and
> `./iosApp/run-app.sh`.

Then add to the spike's single screen:

```kotlin
@Composable
fun SpikeScreen() {
    Column(
        Modifier
            .testTag("spike_screen")            // root container — the CMP-9551 case
            .fillMaxSize()
    ) {
        Button(
            onClick = {},
            modifier = Modifier.testTag("spike_button_primary")
        ) { Text("Simpan") }

        LazyColumn {
            items(3) { i ->
                Row(Modifier.testTag("spike_item_$i")) {
                    Text("Baris $i")
                }
            }
        }
    }
}
```

Verify in Xcode's Accessibility Inspector, then from XCTest:

```swift
func testTagsSurfaceAsAccessibilityIds() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.otherElements["spike_screen"].exists)
    XCTAssertTrue(app.buttons["spike_button_primary"].exists)
}
```

And from Appium:

```python
driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="spike_button_primary")
```

**The decision this stage drives:**

| Result | Action |
|---|---|
| All 5 tags resolve, including the root container | Proceed with the full migration |
| Interactive tags resolve but the root container does not | Proceed, but change how screen-level tags are applied — and update `TestTags.kt` usage, not the tag strings |
| Tags do not surface at all | Stop. Your whole automation strategy depends on this. Re-evaluate the platform |

Record the outcome in `TESTABILITY.md` under "Verified on". Both fields
currently read `__`.

---

## 5. Stage 2 — Build restructure

### 5.1 Version catalog changes

```toml
# gradle/libs.versions.toml
[versions]
composeMultiplatform = "1.12.1"
room = "3.0.3"              # stable — 3.1.0-alpha01 exists but do not track an alpha
sqlite = "2.7.1"            # 2.8.0-alpha01 exists but is a prerelease

[libraries]
androidx-room3-runtime  = { module = "androidx.room3:room3-runtime",  version.ref = "room" }
androidx-room3-compiler = { module = "androidx.room3:room3-compiler", version.ref = "room" }
androidx-sqlite-bundled = { module = "androidx.sqlite:sqlite-bundled", version.ref = "sqlite" }

[plugins]
androidx-room3 = { id = "androidx.room3", version.ref = "room" }
```

⚠️ **Room 3.x uses new artifact coordinates** — `androidx.room3`, not
`androidx.room`. A silent miss here fails late and confusingly.

✅ **Verified on 2026-10-12** against the Maven repositories:

| Artifact | Stable versions available |
|---|---|
| `androidx.room3:room3-runtime` | 3.0.0, 3.0.1, **3.0.2, 3.0.3**, then 3.1.0-alpha01 |
| `androidx.sqlite:sqlite-bundled` | **2.7.1**, then 2.8.0-alpha01 |
| Compose Multiplatform plugin | **1.12.1** latest stable (1.13.0-alpha01/02 are prerelease) |

Pin `room = "3.0.3"` and `sqlite = "2.7.1"`. Do not track alphas mid-migration.

### 5.1.1 ⚠️ Do NOT pin Material3 to a CMP version

This is a build failure waiting to happen, so it is worth stating plainly.

`org.jetbrains.compose.material3:material3` **does not have a 1.12.1 release.**
Its stable versions stop at **1.9.0**:

```
1.6.x … 1.7.x … 1.8.0 1.8.1 1.8.2  1.9.0    ← last stable under the CMP version line
1.10.0+ → alphas only (1.12.0-alpha01..03, 1.13.0-alpha01/02)
```

Since CMP 1.10, the Compose Gradle plugin resolves Material3 internally, and CMP
no longer publishes it under its own version numbers.

| | |
|---|---|
| ✅ Correct | `implementation(compose.material3)` |
| ❌ **Fails to resolve** | `implementation("org.jetbrains.compose.material3:material3:1.12.1")` |

The same applies to the other Compose accessors: use `compose.runtime`,
`compose.foundation`, `compose.materialIconsExtended`,
`compose.components.resources`. Never write their literal coordinates.

`compose.components.resources` does track CMP versions normally (1.12.1 is
published), but still prefer the DSL accessor for consistency.

### 5.2 Module configuration

> ⚠️ **This structure was WRONG and is fixed by Stage 1.** AGP 9.0 refuses to
> combine `com.android.application` with `kotlin-multiplatform`. Google: *"There
> isn't a direct replacement... extract your Android application to a separate
> Gradle module."* Use the three-module layout in §5.2.1 instead.

```kotlin
// composeApp/build.gradle.kts  — KMP LIBRARY module
plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kotlin.multiplatform.library)   // NOT android.application
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.androidx.room3)
}

kotlin {
    androidTarget()
    listOf(iosArm64(), iosSimulatorArm64()).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.materialIconsExtended)
            implementation(compose.components.resources)

            implementation(libs.androidx.room3.runtime)
            implementation(libs.androidx.sqlite.bundled)   // bundles SQLite for both platforms
            implementation(libs.kotlinx.datetime)

            implementation("org.jetbrains.androidx.navigation:navigation-compose:<cmp-version>")
            implementation("org.jetbrains.lifecycle:lifecycle-viewmodel-compose:<ver>")
        }
    }
}

room { schemaDirectory("$projectDir/schemas") }

dependencies {
    add("kspAndroid", libs.androidx.room3.compiler)
    add("kspIosArm64", libs.androidx.room3.compiler)
    add("kspIosSimulatorArm64", libs.androidx.room3.compiler)
}
```

Note `iosX64` is deliberately absent — CMP 1.11.1 dropped it.

### 5.2.1 Correct module layout (AGP 9 requirement)

The structure above predates AGP 9 and does not work. Stage 1 proved this:

```
> The 'com.android.library' (or 'com.android.application') plugin is not
> compatible with the 'org.jetbrains.kotlin.multiplatform' plugin since AGP 9.0.
```

Google's documented path:

> "There isn't a direct replacement for configuring a Kotlin Multiplatform
> module using `com.android.application` plugin. To migrate, extract your
> Android application to a separate Gradle module."

```
composeApp/     KMP library module
                |-- com.android.kotlin.multiplatform.library   (Android target)
                |-- iosArm64 + iosSimulatorArm64 static frameworks
                +-- all shared Kotlin: data/, ui/, design system
                    Room, string resources, navigation

androidApp/     thin com.android.application module
                |-- depends on composeApp
                |-- holds AndroidManifest.xml, res/, build types, versionCode
                +-- MainActivity + Application subclass

iosApp/         Xcode project
                |-- links the ComposeApp static framework
                +-- UIApplicationSceneManifest + CADisableMinimumFrameDuration
```

The Android target moves from `com.android.application` to
`com.android.kotlin.multiplatform.library`, configured inside the `kotlin`
block rather than a top-level `android { }` block:

```kotlin
// composeApp/build.gradle.kts
kotlin {
    android {
        namespace = "id.almezi.saku.shared"
        compileSdk = 37
        minSdk = 24
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
        androidResources { enable = true }   // needed for res/ under androidMain
    }

    listOf(iosArm64(), iosSimulatorArm64()).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }
}
```

### 5.2.2 What the new Android plugin costs Saku

The `com.android.kotlin.multiplatform.library` plugin is **single-variant**.
Anything that depended on Android build variants must move to `androidApp/`:

| Saku has it today | Consequence |
|---|---|
| `buildTypes.release { optimization { enable = false } }` | Must live in `androidApp/`, not the KMP module |
| `defaultConfig { versionCode / versionName }` | Must live in `androidApp/` |
| `debugImplementation("...ui-tooling")` | No build types in the KMP module. Scope via `"androidRuntimeClasspath"(...)` |
| Release minify/shrink settings | `androidApp/` only |
| No `BuildConfig` in the KMP module | The plugin does not generate it. Needed for the debug-only seed/fake-clock hooks (document 01, section 1.10). Use **BuildKonfig**, or keep `BuildConfig` in `androidApp/` |
| Tests disabled by default | Opt in via `withHostTest { }` / `withDeviceTest { }` - the existing 26 unit tests must be re-enabled explicitly |
| `src/main` source layout | Sources move to `src/androidMain`, `src/androidHostTest`, `src/androidDeviceTest` |

None are blockers, but each is a concrete item for Stage 2.

### 5.2.3 iOS launch requirements discovered in Stage 1

Both crash the app at launch with errors that do not name the real cause.

```xml
<!-- iosApp/Info.plist -->
<key>CADisableMinimumFrameDurationOnPhone</key>
<true/>

<key>UIApplicationSceneManifest</key>
<dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <false/>
    <key>UISceneConfigurations</key>
    <dict>
        <key>UIWindowSceneSessionRoleApplication</key>
        <array>
            <dict>
                <key>UISceneConfigurationName</key>
                <string>Default Configuration</string>
                <key>UISceneDelegateClassName</key>
                <string>YourModuleName.SceneDelegate</string>
            </dict>
        </array>
    </dict>
</dict>
```

Without the first key, Compose Multiplatform throws when
`ComposeUIViewController` is created:

> `IllegalStateException: Info.plist doesn't have a valid CADisableMinimumFrameDurationOnPhone entry, or has it set to false.`

Without the scene manifest, the iOS 27 SDK refuses the launch outright:

> `Application failed to launch: UIScene life cycle is required for apps built with this SDK.`

If `UISceneDelegateClassName` does not resolve, register the delegate
programmatically - this worked reliably in the spike:

```swift
func application(_ application: UIApplication,
                 configurationForConnecting session: UISceneSession,
                 options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Default", sessionRole: session.role)
    config.delegateClass = SpikeSceneDelegate.self
    return config
}
```

**Deployment target is iOS 15.0, not 14.0** - see section 9.1.

### 5.5 Stage 2 results — what the plan got wrong

Stage 2 completed on 2026-10-12: `:composeApp` compiles for both iOS targets,
`:app:assembleDebug` succeeds, and all 26 unit tests still pass. Six things
contradicted the plan.

#### 1. Room 3 moved the package, not just the coordinates

The artifact group is `androidx.room3`, and **so is the Kotlin package**:

```kotlin
import androidx.room3.Entity        // NOT androidx.room.Entity
import androidx.room3.Dao
import androidx.room3.RoomDatabase
import androidx.room3.RoomDatabaseConstructor
import androidx.room3.useWriterConnection
import androidx.room3.immediateTransaction
```

A plain `androidx.room.` -> `androidx.room3.` sed across the data layer is the
whole migration for the annotations. `androidx.sqlite.*` is unchanged.

#### 2. `Migration.migrate` is `suspend` in Room 3

```kotlin
override suspend fun migrate(connection: SQLiteConnection) { ... }
```

#### 3. The transaction helpers need explicit imports

`useWriterConnection` and `immediateTransaction` are top-level functions in
`androidx.room3`, not inherited members. Without the imports the error is
`Cannot infer type for type parameter 'R'`, which names neither.

#### 4. The Gradle extension is `room3 { }`, not `room { }`

```kotlin
room3 { schemaDirectory("$projectDir/schemas") }
```

The plugin refuses to configure otherwise:
`The Room Gradle plugin was applied but no schema location was specified.`

#### 5. `org.jetbrains.compose` is a separate, required plugin

Without it, `compose.runtime`, `compose.material3`, and the whole
`compose.resources { }` extension are unresolved. The plan's plugin list in
§5.2 omits it.

#### 6. `Dispatchers.IO` does not exist on Kotlin/Native

`iosMain` must use `Dispatchers.Default`. The compiler says
`Cannot access 'val IO: CoroutineDispatcher': it is internal`.

#### Two more traps worth knowing

- **`kotlinx.datetime.Clock` shadows your own `Clock` interface.** Importing it
  in `Clock.kt` makes `object RealClock : Clock` bind to the datetime type, and
  the failure reads `currentTimeMillis overrides nothing` rather than naming the
  clash. Use `kotlin.time.Clock.System` from the stdlib; the pinned
  `kotlinx-datetime` 0.6.0 has no `Clock` anyway.
- **Gradle reports deeply nested version-catalog accessors as
  `NoClassDefFoundError: names/Build_gradle`,** naming neither file nor line.
  Applying plugins with explicit `id("...") version "..."` avoids the opaque
  failure mode.

#### What deliberately did NOT move

`BackupRepository` stays in `app/`. It depends on `Context`, `Uri`, `java.io`,
`java.text`, and `java.util`, and its JSON handling would need a new serializer
for Kotlin/Native. That is Stage 5 work. `SimpleMoneyTrackerApp` exposes it
alongside `container`, and `CadanganScreen` reads it from there.

### 5.3 Database — the three changes that will bite you

**Change 1 — the constructor.** Room KMP requires an explicit
`expect object` constructor.

```kotlin
// commonMain/kotlin/data/AppDatabase.kt
@Database(entities = [Transaction::class, Category::class, Account::class, Budget::class], version = 3)
@ConstructedBy(AppDatabaseConstructor::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun categoryDao(): CategoryDao
    abstract fun accountDao(): AccountDao
    abstract fun budgetDao(): BudgetDao

    companion object {
        val MIGRATION_1_2 = Migration(1, 2) { connection ->
            connection.execSQL("CREATE TABLE IF NOT EXISTS `accounts` (…)")
            connection.execSQL("ALTER TABLE `transactions` ADD COLUMN `accountId` TEXT NOT NULL DEFAULT 'acc_tunai'")
        }
        val MIGRATION_2_3 = Migration(2, 3) { connection ->
            connection.execSQL("ALTER TABLE `categories` ADD COLUMN `colorHex` TEXT")
            // …
        }
        val ALL_MIGRATIONS = arrayOf(MIGRATION_1_2, MIGRATION_2_3)
    }
}

// Room's compiler generates the `actual` for you.
// @Suppress silences the IDE's "has no actual declaration" warning.
@Suppress("KotlinNoActualForExpect")
expect object AppDatabaseConstructor : RoomDatabaseConstructor<AppDatabase> {
    override fun initialize(): AppDatabase
}
```

**Change 2 — migrations take `SQLiteConnection`.** Your current
`migrate(db: SupportSQLiteDatabase)` will not compile. The SQL itself is
unchanged; only the parameter type and `execSQL` receiver move.

**Change 3 — transactions.** `withTransaction` is Android-only. Both places in
your code need converting:

```kotlin
// commonMain
suspend fun AppDatabase.deleteCustomCategoryAtomically(
    categoryId: String,
    fallbackCategoryId: String
) {
    useWriterConnection { transactor ->
        transactor.immediateTransaction {
            transactionDao().moveCategory(categoryId, fallbackCategoryId)
            budgetDao().delete(categoryId)
            categoryDao().delete(categoryId)
        }
    }
}
```

`immediateTransaction` is the recommended choice under WAL. The same applies to
`TransactionRepository.insertTransactions()` (the bulk-import path).

### 5.4 Platform database builders

```kotlin
// androidMain/kotlin/data/AppDatabase.android.kt
fun getDatabaseBuilder(context: Context): RoomDatabase.Builder<AppDatabase> {
    val appContext = context.applicationContext
    val dbFile = appContext.getDatabasePath("simplemoneytracker.db")
    return Room.databaseBuilder<AppDatabase>(
        context = appContext,
        name = dbFile.absolutePath
    )
}
```

```kotlin
// iosMain/kotlin/data/AppDatabase.ios.kt
import platform.Foundation.NSDocumentDirectory
import platform.Foundation.NSFileManager
import platform.Foundation.NSUserDomainMask

fun getDatabaseBuilder(): RoomDatabase.Builder<AppDatabase> {
    val dir = requireNotNull(
        NSFileManager.defaultManager.URLForDirectory(
            directory = NSDocumentDirectory,
            inDomain = NSUserDomainMask,
            appropriateForURL = null,
            create = false,
            error = null
        )
    )
    return Room.databaseBuilder<AppDatabase>(name = dir.path + "/simplemoneytracker.db")
}
```

Common instantiation:

```kotlin
// commonMain
fun buildDatabase(builder: RoomDatabase.Builder<AppDatabase>): AppDatabase =
    builder
        .addMigrations(*AppDatabase.ALL_MIGRATIONS)
        .setDriver(BundledSQLiteDriver())
        .setQueryCoroutineContext(Dispatchers.IO)
        .build()
```

Use `BundledSQLiteDriver` rather than the platform SQLite so both platforms run
the same SQLite build. If you choose `NativeSQLiteDriver` on iOS instead, you
must add `linkerOpts.add("-lsqlite3")` — one more reason to prefer bundled.

### 5.5 `AppContainer` — drop `Context` from the common path

Today `AppContainer(context: Context)` is the DI root. In KMP, construction is
platform-specific but the graph is common:

```kotlin
// commonMain
class AppContainer(database: AppDatabase, private val clock: Clock = RealClock()) {
    private val transactionDao = database.transactionDao()
    // … same wiring as today …
}
```

```kotlin
// androidMain: AppContainer(context)          ← existing call sites still work
// iosMain:     AppContainer(buildDatabase(getDatabaseBuilder()))
```

Keep `RealClock` in `commonMain` — `kotlin.system.getTimeMillis` or
`Clock.System.now()` works on both, and `AGENTS.md`'s injectable-clock rule
survives untouched.

### 5.6 Stage 2 gate

```bash
./gradlew :composeApp:assembleDebug              # Android still builds
./gradlew :composeApp:testDebugUnitTest          # existing tests still pass
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

Both must pass before continuing. Saku's Android behaviour must not regress
during the migration.

---

## 6. Stage 3 — Resources

### 6.1 Decision required first

`AGENTS.md` says: *"Strings in resource files (Indonesian first); no hard-coded
UI text."* Whichever option you pick, **amend `AGENTS.md` in the same commit.**
A rule the repo violates is worse than no rule.

Recommended: `org.jetbrains.compose.resources`. Structure:

```
composeApp/src/commonMain/composeResources/
├── drawable/            (nothing yet)
├── font/
│   ├── dm_sans_regular.ttf
│   ├── dm_sans_medium.ttf
│   ├── dm_sans_semibold.ttf
│   ├── dm_sans_bold.ttf
│   ├── dm_mono_regular.ttf
│   └── dm_mono_medium.ttf
└── values/
    └── strings.xml      (moved from res/values/strings.xml)
```

### 6.2 Migration mechanics

| Before | After |
|---|---|
| `R.string.tambah_simpan_transaksi` | `Res.string.tambah_simpan_transaksi` |
| `stringResource(R.string.x)` | `stringResource(Res.string.x)` |
| `R.array.months_long` | `Res.array.months_long` (still `getStringArray` via the generated accessor) |
| `R.font.dm_sans_regular` | `Res.font.dm_sans_regular` |

The files barely change — mostly the resource *references* do. Expect ~160
mechanical edits, which is why this is a separate stage.

### 6.3 Two places that need thought, not sed

**`SakuFormat.kt`** — six functions take `Context` purely to read a month or
day name:

```kotlin
// Today — Android-only
fun monthShort(context: Context, month: Int): String =
    context.resources.getStringArray(R.array.months_short)[monthIndex(month)]

// Refactor — platform-agnostic, better design regardless of iOS
fun monthShort(months: List<String>, month: Int): String = months[monthIndex(month)]
```

Pass the array in from the composable. This is a genuine improvement: pure
functions become unit-testable without a `Context`, and your existing
`SakuFormatTest` gains coverage for free.

**`CategoryUiMapper.kt`** — `getCategoryNameRes(id): Int` returns a string
resource ID, and it is called from `@Composable categoryDisplayName()`. With
`compose.resources` the return type changes from `Int` to the generated
accessor type. Rewrite the mapper to return `StringResource`:

```kotlin
fun categoryDisplayName(category: Category): String =
    category.customName ?: stringResource(getCategoryString(category.id))
```

Keep the `when (id)` mapping — it is the ID→name contract from `CATEGORIES.md`
and must not drift.

### 6.5 OPEN (not fixed upstream): Compose resource accessors do not resolve for Android

> **Status: still true.** Re-verified 2026-10-16 — the Android accessor failure
> persists on CMP 1.12.1 and is *not* a regression. It was **worked around**, not
> fixed. See §6.5 in "What actually shipped" below for the mechanism, and note
> that `androidMain` must keep using `R.font.*` rather than `Res.font.*`.

Stage 3 could not be completed. The blocker is a tooling incompatibility, not
a mistake in the migration code.

#### Symptom

With `compose.resources { publicResClass = true }` and the resources in
`composeApp/src/commonMain/composeResources/`, every generated accessor fails to
resolve:

```
e: Probe.kt:5:41 Unresolved reference 'delete'
    val probeResource = Res.string.delete
```

It fails in **both** directions:
- from `:app`, against the published `:composeApp` compile jar
- from inside `:composeApp`'s own `commonMain`, compiled for Android

It also fails with the correct import, with `packageOfResClass` in a dedicated
package, and with `compose.components.resources` declared as `api`.

#### Evidence it is an environment gap, not the code

| Check | Result |
|---|---|
| Dependencies resolve | `androidx.room3:room3-runtime-iossimulatorarm64` and `androidx.sqlite` resolve cleanly |
| Accessor sources are generated | `String0/String1/Font0/Array0.commonMain.kt` exist under `build/generated/compose/resourceGenerator/` |
| Accessor **classes** are compiled | `String0_commonMainKt.class` is present in the Android compile jar |
| The members are public | `javap` shows `public static final StringResource getNav_tambah(Res$string)` |
| The runtime jar has them | **No.** 0 of `String0/String1/Font0/Array0` appear in `runtime_library_classes_jar` |
| Handwritten common code crosses modules | **Yes.** A hand-written extension in `:composeApp` resolves from `:app` |

That last pair is the diagnosis: the generated accessors are never attached to
the **Android** compilation's source set. They are wired into the iOS/native
compilations, which is why the same code compiles for iOS and fails for Android.
It worked in the Stage 1 spike module, which had **no Android target at all** —
so the spike could never have caught this. (That module has since been deleted;
see §4.1.)

#### What was tried

| Attempt | Result |
|---|---|
| Consume `Res.string.*` from `:app` | ❌ Unresolved |
| Consume from `:composeApp` `commonMain` | ❌ Unresolved |
| `packageOfResClass` moved to a dedicated package | ❌ Unresolved |
| `implementation` → `api` for `compose.components.resources` | ❌ Unresolved |
| Google's `androidComponents { onVariants { variant.sources.kotlin?.addStaticSourceDirectory(...) } }` escape hatch, adding the generated `commonResClass` and `commonMainResourceAccessors` directories | ❌ Block confirmed firing, sources present on disk, still unresolved |

Configuration in play: **AGP 9.4.1**, **Kotlin 2.4.20**, **Compose Multiplatform
1.12.1**, **Gradle 9.7.1**, plugin
`com.android.kotlin.multiplatform.library` (required, since AGP 9.0 forbids
`com.android.application` + KMP).

#### Decision taken

The whole tree was reverted to the Stage 2 state rather than left half-migrated:

- Android `res/values/strings.xml` restored (163 strings, 224 lines)
- All 6 DM fonts restored to `app/src/main/res/font/`
- All 21 UI files restored to `R.string.*`
- `composeResources/`, the `compose.resources` block, and the
  `androidComponents` workaround all removed from `:composeApp`

Re-verified after the revert: both iOS targets compile, `:app:assembleDebug`
succeeds, all 26 unit tests pass. Nothing is left in a broken state.

#### Options for Stage 3 when it resumes

1. **Check for a plugin fix.** This is a bug worth reporting to JetBrains or
   Google with the evidence above. Re-test after upgrading AGP, KGP, or CMP.
2. **Pin Compose Multiplatform to a version whose accessors wire up for Android.**
   CMP 1.11.x or 1.10.x may not have the regression.
3. **Use a different multiplatform string solution** — `moko-resources`, or
   `kotlinx.serialization`-based constants in `commonMain`. Both are worse than
   the AGENTS.md rule but neither depends on the broken codegen.
4. **Move the UI into `:composeApp` first (Stage 4) and retry.** Uncertain: the
   failure is in the Android *target* of `:composeApp`, so relocating the
   consumers may not help.

Note that the design-system work from Stage 1.5 proved the fonts and the
`Res.font.*` path work for iOS, so this is specifically an Android-target
problem.

### 6.4 Stage 3 gate

Open the app on Android and diff every screen against a pre-migration
screenshot. All Indonesian copy must be identical. A single mistranslated or
dropped string here is invisible to tests and ships silently.

> **This gate was never run in the visual sense.** Android has no device or
> emulator attached on this machine, so `installDebug` fails. Stage 3 copy
> fidelity was verified by test and string-count only (165 strings, 3 arrays,
> all reachable from code, zero dead entries). **Treat "Android copy is
> unchanged" as unverified and re-check it when a device is available.**

---

## 6A. What actually shipped for resources

The four options above were the plan as written. Option 3 was taken, and refined
into something the original doc did not anticipate.

### 6.5b RESOLVED (worked around, not fixed upstream): generated `SakuStrings`

The Android accessor failure was **not** fixed — it is a real CMP limitation and
still applies today. Option 3 was chosen: drop CMP's resource accessors for
strings entirely and generate Kotlin constants instead.

**Mechanism.** A Gradle task, `:composeApp:generateSakuStrings`, parses
`composeApp/shared-strings/strings.xml` and writes `SakuStrings.kt` into
`composeApp/build/generated/…`, a directory added to `commonMain` via
`kotlin.sourceSets.getByName("commonMain").kotlin.srcDir(...)`. Code reads
`SakuStrings.tambah_simpan` instead of `stringResource(R.string.tambah_simpan)`.

```
composeApp/shared-strings/strings.xml     ← single source of truth (165 strings, 3 arrays)
        │
        │  :composeApp:generateSakuStrings
        ▼
composeApp/build/generated/…/SakuStrings.kt
        │
        ▼
commonMain → Android + iOS
```

**Why this over the alternatives.**

| Option | Verdict |
|---|---|
| Put resources in `androidMain/composeResources` too | **Unworkable.** Both source sets then feed `CopyResourcesToAndroidAssetsTask` and produce an unconfigurable duplicate error. The task has no `duplicatesStrategy` setter, and Google's `androidComponents` escape hatch does not help |
| Downgrade CMP to find a version whose accessors wire up | **Tried and rejected.** Verified broken on 1.10.3, 1.11.1 **and** 1.12.1, so it is not a regression |
| `moko-resources` | Rejected: new dependency, new codegen, same category of risk |
| **`kotlinx.serialization` constants** | **Adopted.** No runtime resource lookup at all, so Android cannot regress again |

**Cost, stated plainly.** No runtime locale switching — every locale compiles to
the same constants. Saku is Indonesian-only, so this costs nothing today. If
that changes, this decision must be revisited.

**Rule that follows from it.** `AGENTS.md` now states that strings live in
`composeApp/shared-strings/strings.xml`, are read as `SakuStrings.<name>`, are
generated by `:composeApp:generateSakuStrings`, and that **`SakuStrings.kt` must
never be edited by hand** — it is build output.

### 6.6 Fonts: the same workaround, but fonts still need the plugin

Strings could be abandoned entirely. **Fonts could not**, because a font is
binary data that must be loaded at runtime, so there is no equivalent of a
`const val`.

Compose Multiplatform's `composeResources/font/` works correctly for **iOS**
(`Res.font.*` resolves fine — Stage 1.5 proved it). It fails only for the
**Android** target, per §6.5. So the six TTFs exist in two places:

| Platform | Path | Accessor |
|---|---|---|
| Android | `composeApp/src/androidMain/res/font/` | `R.font.*` (Android resource ID) |
| iOS | `composeApp/src/commonMain/composeResources/font/` | `Res.font.*` (CMP `FontResource`) |

They are **byte-identical**; treat them as one logical file. Collapse them the day
CMP generates working Android accessors.

The bridge is a two-function `expect`/`actual` pair in
`ui/designsystem/SakuFonts.kt`, which keeps `SakuType.kt` free of platform code.

Note the CMP font constructor is `org.jetbrains.compose.resources.Font`, not
`androidx.compose.ui.text.font.Font` — the latter resolves only to
`Font(resId: Int)` and fails to compile against a `FontResource`.

### 6.7 OPEN: `compose-resources` packaging for the app variant

**This blocks Stage 4's gate (4.14) and therefore Stage 5.**

Compose Multiplatform expects an **Xcode build phase** to copy
`compose-resources/` into the app bundle. Without a `.xcodeproj` there is no such
phase, so the resources must be copied by hand — and the Gradle task that would
supply them **does not exist for the app variant**:

```
:composeApp:copyTestComposeResourcesForIosSimulatorArm64   ✅ exists
:composeApp:copyComposeResourcesForIosSimulatorArm64Main   ❌ does not exist
```

The Stage 1 spike appeared to prove this was solved only because it consumed
`build/bin/iosSimulatorArm64/**debugTest**/compose-resources` — test-variant
resources. The app variant has no equivalent, and the built
`ComposeApp.framework` contains no `compose-resources` directory.

Omitting the directory crashes on first composition with
`MissingResourceException: Missing resource with path: .../compose-resources/…`.

`iosApp/build-app.sh` currently points at the debugTest path as a stopgap. That
is **not a real fix** — test-variant resources can drift from app-variant ones.

**Resolution:** build the `.xcodeproj` (Stage 4 item 4.11) and let the standard
`embedAndSignAppleFrameworkForXcode` integration package the resources. Do not
treat the hand-rolled script as a permanent answer.

---

## 7. Stage 4 — UI

### 7.1 Design system first

`ui/designsystem/` and `ui/components/` move to `commonMain` almost unchanged —
they are pure Compose and use only tokens. Expect breakage concentrated in:

- Experimental APIs that graduated or were removed between Compose 1.6 and 1.12
- `LocalContext.current` used for non-`Context` purposes
- `R.font.*` references (Stage 3)

### 7.2 Navigation rewrite

`NavGraph.kt` uses string routes. CMP navigation uses typed destinations:

```kotlin
// Before — androidx.navigation (Android only)
sealed class Screen(val route: String) {
    object Tambah : Screen("tambah")
    object UbahTransaksi : Screen("ubah_transaksi/{transactionId}") {
        fun route(transactionId: Long) = "ubah_transaksi/$transactionId"
    }
}

// After — org.jetbrains.androidx.navigation
@Serializable data object Tambah
@Serializable data object Daftar
@Serializable data object Ringkasan
@Serializable data object Cadangan
@Serializable data class UbahTransaksi(val transactionId: Long)

NavHost(navController) {
    composable<Tambah> { TambahScreen(/* … */) }
    composable<UbahTransaksi> { entry ->
        val args = entry.toRoute<UbahTransaksi>()
        UbahTransaksiScreen(transactionId = args.transactionId, /* … */)
    }
}
```

`Serializable` route objects also remove your hand-rolled `route()` builders and
the `ARG_TRANSACTION_ID` constants. Net simplification, but it is a rewrite of
~140 lines.

### 7.3 Date picker

`TransactionForm.kt` uses `android.app.DatePickerDialog`. Replace with the CMP
Material3 `DatePicker`, which composes rather than dialogs — so it needs a
`ModalBottomSheet` or `Dialog` wrapper to match the current look. Re-implement
the future-date restriction:

```kotlin
val today = remember { clock.currentTimeMillis() }
DatePicker(state = rememberDatePickerState(
    initialSelectedDateMillis = selectedMillis,
    selectableDates = object : SelectableDates {
        override fun isSelectableDate(utcTimeMillis: Long) =
            utcTimeMillis <= todayAtMidnightJakarta
    }
))
```

Watch the timezone: `DatePicker` works in UTC millis, your app works in
Asia/Jakarta. The conversion is an easy place to introduce an off-by-one day.

### 7.4 Entry points

Android keeps `MainActivity`, thinned to `setContent { … }` over common code.

iOS gets a new entry point:

```kotlin
// composeApp/src/iosMain/kotlin/id/almezi/simplemoneytracker_kt/MainViewController.kt
import androidx.compose.ui.window.ComposeUIViewController

fun MainViewController(): UIViewController = ComposeUIViewController { App() }
```

```swift
// iosApp/SakuApp.swift  (as shipped — a UIKit scene delegate, not SwiftUI)
import UIKit
import ComposeApp

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = MainViewControllerKt.MainViewController()
        window.makeKeyAndVisible()
        self.window = window
    }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: session.role)
    }
}
```

> Two deviations from the sketch above, both learned the hard way:
>
> 1. **UIKit scene delegate, not SwiftUI.** The iOS 27 SDK requires a `UIScene`
>    lifecycle. A SwiftUI `App` would work, but a plain `AppDelegate` +
>    `SceneDelegate` keeps the harness compiling with bare `swiftc` and no
>    storyboard.
> 2. **`@main` requires `-parse-as-library`** when compiling with `swiftc`
>    directly. Without it: *"'main' attribute cannot be used in a module that
>    contains top-level code"*. This does not arise under Xcode.

#### SwiftUI sketch superseded by the shipped UIKit host

The original plan sketched a `UIViewControllerRepresentable` wrapper. It was not
used; `iosApp/SakuApp.swift` uses a plain scene delegate instead (see the note
above).

### 7.6 Conventions this project follows

Recorded because they are enforced by review, not by the compiler:

| Rule | Where |
|---|---|
| **No platform imports in `commonMain`** — no `android.*`, `java.*`, `platform.*` | Verified: zero today |
| **All versions in `gradle/libs.versions.toml`** — never a literal coordinate in a build script | `libs.androidx.room3.runtime`, `libs.androidx.navigation.compose`, … |
| **No platform suffix in file names.** The source set folder carries it | `SakuFonts.kt` exists in both `androidMain` and `iosMain`; `AppContainerFactory.kt` likewise. Never `SakuFonts.ios.kt` |
| **Name files by responsibility** | The DB factory is `AppContainerFactory.kt`, not `Platform.kt` — a platform-neutral name would collide with the `expect` file and break the JVM class name |
| **`expect` in `commonMain` only, an `actual` in every enabled target** | `sakuFontSans`/`sakuFontMono`. `AppDatabaseConstructor` is exempt: Room generates the `actual` via KSP, and carries `@Suppress("KotlinNoActualForExpect")` to say so |
| **Thin platform source sets — no business rules** | `androidMain`/`iosMain` hold 2–3 files each: DB path, font loading, iOS entry point |
| **Shared tests in `commonTest` with `kotlin.test`** | 47 tests. Run with `./gradlew :composeApp:testAndroid` (host) or `:composeApp:allTests` |
| **Platform-agnostic components via `expect`/`actual`, platform glue by slot** | Backup is `@Composable (() -> Unit, () -> Unit) -> Unit` on `NavGraph`, not an `expect fun` |
| **Derive the dispatcher, not the function** | `buildDatabase(builder, dispatcher)` lives in `commonMain`; each platform passes its own. Duplicating the function per platform invites drift |

Note `androidLibrary { }` is used inside `kotlin { }`, not `androidTarget()`.
That is the AGP 9 convention and is what the official KMP wizard now emits; the
two are not interchangeable in AGP 9.4.

```bash
# The full gate, in the order that catches the most:
./gradlew :composeApp:compileAndroidMain           # commonMain has no Android leak
./gradlew :composeApp:compileKotlinIosSimulatorArm64
./gradlew :app:assembleDebug                       # Android app links
./gradlew :composeApp:testAndroid                  # 47 commonTest tests
```
        MainViewControllerKt.MainViewController()
    }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

struct ContentView: View {
    var body: some View { ComposeView().ignoresSafeArea(.keyboard) }
}
```

### 7.5 Stage 4 gate

All 9 screens render on both platforms. Verify against `UI_SPEC.md` §6.1–6.7 —
in particular the dark-only theme, the 48 dp touch targets (iOS HIG minimum is
44 pt, so 48 dp is comfortably above), and the floating bottom-nav insets,
which behave differently with the iOS home indicator.

---

## 8. Stage 5 — Platform I/O

Four Android-specific capabilities need expect/actual abstractions.

| Capability | Android | iOS |
|---|---|---|
| Document picker | SAF `OpenDocument` | `UIDocumentPickerViewController` |
| Share a file | `FileProvider` + `ACTION_SEND` | `UIActivityViewController` |
| Preferences | `SharedPreferences` | `NSUserDefaults` |
| File paths | `getExternalFilesDir` | `NSDocumentDirectory` |

Define each as an `expect` interface in `commonMain`, implement per platform,
and pass the implementation into `AppContainer`. Keep the DI manual, per
`AGENTS.md`.

```kotlin
// commonMain
interface PlatformFileStore {
    suspend fun writeFile(name: String, content: String): String
    suspend fun shareFile(path: String)
    suspend fun pickFile(): String?
}
```

Two notes specific to this app:

- **Fixing the Android export bug is nearly free here.** `docs/07` §7.7
  records that exports are written to `getExternalFilesDir` with no
  `FileProvider`, which Android 11+ hides from the file picker — so users
  cannot retrieve their own backups. Stage 5 makes you touch this code anyway.
  Add the `FileProvider` on Android while you are in there. iOS sharing via
  `UIActivityViewController` is about ten lines.
- **Verify CSV/JSON output is byte-identical across platforms.** Both use
  `SimpleDateFormat`, `Calendar`, and `DecimalFormat`, which are JVM-only. In
  `commonMain` you must replace them with `kotlinx-datetime` and manual
  formatting. Getting `yyyy-MM-dd` in Asia/Jakarta wrong by one day would
  silently corrupt every backup date.

---

## 9. Stage 6 — Shipping

### 9.1 Store requirements

| Item | Requirement |
|---|---|
| Apple Developer Program | $99/year, required even for TestFlight |
| Bundle ID | Alphanumerics, hyphens, periods only — **no underscores** |
| Deployment target | **iOS 15.0** — not 14.0. CMP 1.12.1 documents 14, but Kotlin 2.4.20's native runtime is built for 15.0 (linker warns). Confirmed in Stage 1 |
| Architecture | arm64 device + arm64 simulator. **No Intel Mac simulator** |
| Signing | Apple Distribution certificate + provisioning profile |
| Framework | Static, linked into the Xcode app target |

### 9.2 Xcode build

```bash
# Build the framework from Gradle first
./gradlew :composeApp:linkReleaseFrameworkIosArm64

# Then in Xcode: Product → Archive → Distribute App → App Store Connect
```

Add the framework to "Embed & Sign" in the target's *Frameworks, Libraries, and
Embedded Content*.

### 9.3 App Privacy answers

Accurate and short: **Data Not Collected**, **not shared**, stored on-device
only. No analytics, no tracking, no network permission — this is easy to attest
because it is enforced by the absence of `INTERNET` in the manifest.

### 9.4 Post-ship

Update `AGENTS.md` (the "Android first, iOS later" line is now stale), `UI_SPEC.md`,
`TESTABILITY.md` "Verified on", and this documentation set.

---

## 10. Strategic note

`AGENTS.md` describes Saku as *"a small, local-only personal money tracker,
built purely as a test target for mobile automation. Not a product. Keep it
small."*

Two honest readings of an iOS release:

**If the goal is automation coverage on iOS** — Stage 1 alone may be enough. You
could validate that the tags surface as accessibility IDs without migrating the
data layer at all. If it works, you know the migration is *possible*; whether it
is *worth* 4–6 weeks is a separate question.

**If the goal is distribution** — then the missing features surface. There is
no CSV import (`UI_SPEC.md` §8), export is unreachable on Android 11+ (§7.7
above), imports silently drop accounts and `createdAt`, there is no
`FileProvider` or share sheet, and no screen lets a user manage accounts.
Shipping those to the App Store as-is would be shipping known data-loss paths.

My recommendation: **do Stage 1, then decide.** It is 2–3 days, and it converts
the largest unknown in this plan into a fact. If you want, I can scaffold the
Stage 0 spike module now.

---

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ~~**CMP-9551**: root-container tags surface on a synthetic child~~ | **DID NOT REPRODUCE** | — | Verified in Stage 1: `tambah_screen` on a root `Box` resolves as a normal element. Risk retired |
| Compose 1.6 → 1.12 breaking changes are worse than expected | High | Medium | Stage 4 gate is "all screens render"; isolate the fix in one stage |
| ~~Room 3.x coordinates are alpha~~ | **RESOLVED** | — | Stable `room3-runtime` **3.0.3** and `sqlite-bundled` **2.7.1** confirmed on Maven. Pin those, not the alphas |
| ~~Intel Mac simulator~~ | **RESOLVED** | — | `uname -m` = `arm64`, Apple M5. Not applicable |
| **Xcode `xcode-select` misconfigured on this machine** | **Certain — true now** | High — blocks all iOS tooling | `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`. Runtime and devices are already installed; only the developer dir is wrong |
| Pinning `compose.material3` to a CMP version fails to resolve | High if you pin it | Medium — build fails, obvious cause | Use the `compose.material3` DSL accessor only. `org.jetbrains.compose.material3:material3` has no 1.12.x stable. See §5.1.1 |
| `DatePicker` UTC vs Asia/Jakarta off-by-one | High | High — wrong transaction dates | Unit-test the boundary days in `commonMain` |
| `SimpleDateFormat`/`Calendar` unavailable in `commonMain` | Certain | Medium | Replace with `kotlinx-datetime` in Stage 5; verify byte-identical output |
| Bundle ID change conflicts with a Play listing | Medium | High | Settle in Stage 2 item 2.2, before any release |
| Migration causes Android regression | Medium | High | Stage 2 and 3 gates require Android tests and screenshots to pass unchanged. Baseline confirmed clean: 26 tests pass |
| Backup defects shipped to the store | Certain if unaddressed | High | See §10 — fix before distributing |

### Open questions for you

1. **Is the goal automation coverage or distribution?** It changes whether
   Stage 2–5 are worth doing at all.
2. **Can the Android `applicationId` change?** If the app is already on Play,
   no — and then iOS needs a different ID, which is fine.
3. **Do you want the backup defects fixed as part of this?** Stages 5 and 6
   already touch that code.
4. **Do you have an Apple Developer account?** Stages 6 only.

---

## See also

- [01-architecture-blueprint.md](01-architecture-blueprint.md) — the layers being migrated
- [02-tech-stack-dependencies.md](02-tech-stack-dependencies.md) — the versions being changed
- `AGENTS.md` — the stack claim this plan makes real
- `TESTABILITY.md` — the Stage 0 question this plan answers