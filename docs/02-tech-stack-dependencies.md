# 2. Tech Stack & Dependency Manifest

Purpose: record exactly what the project is built from, at which versions, and
why each piece is there — so a future setup or upgrade does not have to
rediscover it.

Verified against branch `feature/improve-design-2.0`, HEAD `8c7dc3a`.
Sources: `gradle/libs.versions.toml`, `app/build.gradle.kts`,
`settings.gradle.kts`, `gradle/wrapper/gradle-wrapper.properties`,
`.idea/misc.xml`, `local.properties`.

---

## 2.1 Language and framework

| Item | Value | Source |
|---|---|---|
| Language | Kotlin | `app/src/**` |
| UI framework | Jetpack Compose (Material 3) | `buildFeatures.compose = true` |
| Language plugin | `org.jetbrains.kotlin.plugin.compose` | `libs.versions.toml` |
| Architecture | MVVM + StateFlow | `AGENTS.md`, implemented in `data/` + `ui/` |
| DI | Manual constructor injection | `data/AppContainer.kt` |
| Persistence | Room (AndroidX) + SQLite | `data/AppDatabase.kt` |
| Date/time | kotlinx-datetime | `SakuFormat.kt` |
| Navigation | Jetpack Navigation Compose | `navigation/NavGraph.kt` |
| Async | Kotlin Coroutines + Flow | throughout |
| Annotation processing | KSP | `libs.versions.toml` |
| Dependency management | Gradle version catalog | `gradle/libs.versions.toml` |

### A note on Kotlin Multiplatform

`AGENTS.md` lists "Kotlin Multiplatform + Compose Multiplatform (official
template)" as the stack, and the multiplatform playground template left
`android.disallowKotlinSourceSets=false` in `gradle.properties`.

**The codebase is currently Android-only.** The plugins applied are
`com.android.application`, `org.jetbrains.kotlin.plugin.compose`, and
`com.google.devtools.ksp` — there is no `kotlin-multiplatform` plugin, no
`iosMain`/`commonMain` source set, and no `compose.ui` KMP artifacts. Sources
live in `app/src/main/java`, the traditional Android layout. Room is the
AndroidX Room, not Room KMP.

Treat "iOS comes later" as the stated intent, and read the multiplatform
mentions as inherited from the template. Verify against `app/build.gradle.kts`
before planning any cross-platform work.

---

## 2.2 Toolchain versions

| Component | Version | Notes |
|---|---|---|
| Gradle | **9.7.1** | `gradle/wrapper/gradle-wrapper.properties`, `-bin` distribution |
| Android Gradle Plugin | **9.4.1** | `libs.plugins.android.application` |
| Kotlin | **2.4.20** | via `libs.plugins.kotlin.compose` |
| KSP | **2.3.12** | `libs.plugins.ksp` |
| Gradle plugin portal toolchains | `foojay-resolver-convention` **1.0.0** | `settings.gradle.kts`, auto-provisions JDKs |
| JVM bytecode target | **Java 17** | `sourceCompatibility` / `targetCompatibility` |
| Project JDK in the IDE | **JDK 25** (`jbr-25`, `languageLevel="JDK_25"`) | `.idea/misc.xml`. Different from the 17 bytecode target — that is normal and fine |

### Repositories

`settings.gradle.kts` sets `RepositoriesMode.FAIL_ON_PROJECT_REPOS`, so all
repositories are declared centrally and no module may add its own.

| Repository | Scope |
|---|---|
| `google()` | `com.android.*`, `com.google.*`, `androidx.*` (plugin management is filtered by `includeGroupByRegex`) |
| `mavenCentral()` | everything else |
| `gradlePluginPortal()` | plugin resolution |

### Gradle properties

| Property | Value | Effect |
|---|---|---|
| `org.gradle.jvmargs` | `-Xmx2048m -Dfile.encoding=UTF-8` | Daemon heap. Raise to 4096m if builds are slow; Kotlin + KSP + Room compilation is the usual cause |
| `org.gradle.configuration-cache` | `true` | Config cache on. If a plugin misbehaves, this is the first flag to check |
| `kotlin.code.style` | `official` | IntelliJ Kotlin style |
| `android.disallowKotlinSourceSets` | `false` | Left over from the KMP template |

---

## 2.3 OS version support

| | Value |
|---|---|
| **minSdk** | **24** (Android 7.0 Nougat) |
| **targetSdk** | **37** |
| **compileSdk** | **37** |
| Supported ABIs | all (no native code, no NDK, no ABI filters) |
| Android Studio SDK platform installed | `android-37.0` |
| Build tools installed | `36.0.0`, `37.0.0` |

### Android only

There is **no iOS target**, no deployment target, and no Xcode requirement.
`TESTABILITY.md` "Verified on" lists iOS as an open Stage 0 question
("do Compose test tags surface as accessibility IDs?"). Until a multiplatform
plugin is added, iOS is not a supported platform — do not promise it.

### Permissions

**None.** `AndroidManifest.xml` declares no `<uses-permission>` at all, in
particular no `INTERNET`. The app is offline by construction.

---

## 2.4 Dependency manifest

### Version catalog

Declared in `gradle/libs.versions.toml`:

```toml
[versions]
agp = "9.4.1"
kotlin = "2.4.20"
coreKtx = "1.10.1"
junit = "4.13.2"
junitVersion = "1.1.5"
espressoCore = "3.5.1"
appcompat = "1.6.1"
material = "1.10.0"
room = "2.8.4"
composeBom = "2024.02.00"
datetime = "0.6.0"
lifecycle = "2.9.0"
animatedVectorDrawable = "28.0.0"
```

⚠️ `animatedVectorDrawable` (`com.android.support:animated-vector-drawable:28.0.0`)
is declared but **never referenced** in `app/build.gradle.kts`. It is also an
Android Support Library artifact — superseded by AndroidX. Safe to delete from
the catalog.

### Runtime dependencies

| Dependency | Version | Purpose | Used where |
|---|---|---|---|
| `androidx.core:core-ktx` | 1.10.1 | Kotlin extensions for the Android framework | general |
| `androidx.appcompat:appcompat` | 1.6.1 | AppCompat resources; backs `Theme.MaterialComponents.DayNight.NoActionBar` in `themes.xml` | `res/values/themes.xml` |
| `com.google.android.material:material` | 1.10.0 | Material Components theme attributes (`colorPrimary`, `android:statusBarColor`, …) | `themes.xml`, launcher/system-bar theming |
| `androidx.compose.ui:ui` | via BOM | Compose core primitives, `testTag`, graphics | every `@Composable` |
| `androidx.compose.material3:material3` | via BOM | Material 3 components (`Text`, `Icon`, `MaterialTheme`) | every `@Composable` |
| `androidx.compose.material:material-icons-extended` | via BOM | `Icons.Default.Add`, `Summarize`, `CalendarMonth`, `AutoMirrored.Filled.List` | `NavGraph.kt`, `TransactionForm.kt` |
| `androidx.compose.ui:ui-tooling-preview` | via BOM | `@Preview` support | design system previews |
| `androidx.activity:activity-compose:1.9.0` | **1.9.0, pinned inline** | `setContent`, `rememberLauncherForActivityResult` / `ActivityResultContracts.OpenDocument` | `MainActivity.kt`, `CadanganScreen.kt` |
| `androidx.navigation:navigation-compose:2.7.7` | **2.7.7, pinned inline** | `NavHost`, `NavController`, route arguments | `navigation/NavGraph.kt`, `MainActivity.kt` |
| `androidx.room:room-runtime` | 2.8.4 | Room database, `@Entity`, `@Dao`, `withTransaction` | `data/` |
| `androidx.room:room-ktx` | 2.8.4 | Coroutine/Flow support for Room | `data/` |
| `org.jetbrains.kotlinx:kotlinx-datetime` | 0.6.0 | `LocalDate`, `Instant`, `TimeZone`, `atStartOfDayIn`, `plus(month)` | `SakuFormat.kt`, `BackupRepository.kt` |
| `androidx.lifecycle:lifecycle-viewmodel-compose` | 2.9.0 | `ViewModel`, `viewModelScope`, `viewModel(factory = …)` | every `*ViewModel.kt`, every screen |
| `androidx.compose.ui:ui-tooling` | via BOM | **debug only** — preview inspector, layout bounds | `debugImplementation` |

### Build-time plugins

| Plugin | Version | Role |
|---|---|---|
| `com.android.application` | 9.4.1 | Android build |
| `org.jetbrains.kotlin.plugin.compose` | 2.4.20 | Compose compiler plugin (required by Kotlin 2.x) |
| `com.google.devtools.ksp` | 2.3.12 | Runs the Room annotation processor |

### Test dependencies

| Dependency | Version | Scope | Purpose |
|---|---|---|---|
| `junit:junit` | 4.13.2 | `testImplementation` | JVM unit tests |
| `androidx.test.ext:junit` | 1.1.5 | `androidTestImplementation` | AndroidJUnit4 runner |
| `androidx.test.espresso:espresso-core` | 3.5.1 | `androidTestImplementation` | View assertions in instrumented tests |

Instrumentation runner: `androidx.test.runner.AndroidJUnitRunner`.

### Platform APIs used directly (no library)

| API | Where | Note |
|---|---|---|
| `android.app.DatePickerDialog` | `ui/transaction/TransactionForm.kt` | Platform date picker, not Material 3 `DatePicker` |
| `android.content.Context.getSharedPreferences("saku_backup", MODE_PRIVATE)` | `CadanganViewModel` | Stores `last_backup_millis` |
| `android.net.Uri` + `ContentResolver.openInputStream` | `BackupRepository.readText` | SAF import read |
| `org.json.JSONObject` / `JSONArray` | `BackupRepository` | JSON backup serialization — the platform parser, not Moshi/Gson |
| `android.os.SystemClock.elapsedRealtime()` | `MainActivity` | Loading-screen animation timing only |
| `java.text.SimpleDateFormat` / `DecimalFormat` | `BackupRepository`, `SakuFormat` | CSV date column, percent formatting |
| `java.util.Calendar` / `TimeZone` | `BackupRepository` | Asia/Jakarta for CSV dates |
| Compose text measurement | `ui/components/SakuFields.kt` | Amount field auto-sizes the font as digits accumulate |

---

## 2.5 Build configuration

```kotlin
android {
    namespace = "id.almezi.simplemoneytracker_kt"
    compileSdk = 37

    defaultConfig {
        applicationId = "id.almezi.simplemoneytracker_kt"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release { optimization { enable = false } }   // R8/resource shrinking disabled
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures { compose = true }
}
```

Three things to be aware of:

1. **`optimization.enable = false`** in release. No R8 minification, no resource
   shrinking. That is why the release APK is ~14 MB. It also means no
   `keepRules` are required — `app/src/main/keepRules/rules.keep` contains only
   the template comments.
2. **No `signingConfigs` block at all.** Release builds are produced
   **unsigned** (manual local builds; no CI).
3. **`buildConfig` is not enabled.** `BuildConfig` is not generated, so
   `BuildConfig.DEBUG` cannot currently gate debug-only hooks. Turn it on if
   you implement the seed/fake-clock intents (see
   [01 §1.10](01-architecture-blueprint.md)).

---

## 2.6 Bundled assets

### Fonts (`app/src/main/res/font/`, from `third_party/fonts/`)

| File | Family | Weights | Usage |
|---|---|---|---|
| `dm_sans_regular.ttf` | DM Sans | Normal | body text |
| `dm_sans_medium.ttf` | DM Sans | Medium | — |
| `dm_sans_semibold.ttf` | DM Sans | SemiBold | buttons, chips, body emphasis |
| `dm_sans_bold.ttf` | DM Sans | Bold | screen titles, primary buttons |
| `dm_mono_regular.ttf` | DM Mono | Normal | — |
| `dm_mono_medium.ttf` | DM Mono | Medium | **every amount and every month label** |

Fonts are bundled as raw TTFs, not downloadable fonts — no Google Fonts
dependency, no runtime fetch, no certificate arrays.

DM Sans and DM Mono are licensed under the **SIL Open Font License 1.1**.

### Launcher icon

Adaptive icon with three layers: `ic_launcher_background.xml`,
`ic_launcher_foreground.xml`, `ic_launcher_monochrome.xml`, plus
`mipmap-anydpi-v26/ic_launcher{,_round}.xml`. Generated by the Python scripts
`third_party/gen_launcher_bitmap.py` and `third_party/gen_launcher_icon.py`.

### Other resources

- `res/values/strings.xml` — 224+ entries, Indonesian, plus `days_short`,
  `months_short`, `months_long` string arrays
- `res/values/colors.xml` — `saku_violet`, `saku_bg`, `white`, `black` for the XML theme
- `res/values/themes.xml` — `Theme.SimpleMoneyTrackerKT`, one theme for day and night (dark-only app)
- `res/xml/backup_rules.xml`, `res/xml/data_extraction_rules.xml` — referenced by the manifest for `allowBackup="true"`

---

## 2.7 Runtime footprint

| Item | Value |
|---|---|
| Database file | `simplemoneytracker.db` in the app's private database dir |
| `android:allowBackup` | `true` — system cloud backup / device transfer is allowed |
| SharedPreferences file | `saku_backup` (single `Long`) |
| Export files | `saku-cadangan.csv`, `saku-cadangan.json` in `getExternalFilesDir(null)` |
| Debug build APK | produced by `installDebug`, signed with the debug keystore |
| Release APK | `release/SimpleMoneyTrackerKT-v1.0.apk`, 14.67 MB, **unsigned**, SHA-256 `fd7080e690a9b99212a85019e761d5793f0ef6226bba83bc3f16bb9e03e59b54`, built 2026-10-11 |

---

## 2.8 Upgrade guidance

| Change | Notes |
|---|---|
| Bump a library | Edit `gradle/libs.versions.toml`. Do not inline a version in `app/build.gradle.kts` — `activity-compose` and `navigation-compose` are currently pinned inline and should be moved into the catalog when touched |
| AGP / Gradle | AGP 9.4.1 with Gradle 9.7.1. Change both together and check AGP's compatibility matrix |
| Kotlin | The Compose plugin version tracks the Kotlin version. Bump Kotlin ⇒ bump `kotlin-compose` |
| KSP | Must match the Kotlin version. KSP 2.3.12 goes with Kotlin 2.4.20 |
| Room | Bumping past 2.8.4 changes KMP support and the `withTransaction` imports. Check `deleteCustomCategoryAtomically` after |
| minSdk | Raising above 24 reduces the install base. Nothing in the code depends on 24 specifically, but verify `DatePickerDialog` behavior |
| Adding an iOS target | Larger than a version bump — it needs `kotlin-multiplatform`, KMP Compose artifacts, `commonMain` restructuring, and a decision about Room KMP vs SQLDelight. `AGENTS.md` already names both options |
| Adding a dependency | Check it does not need a new permission. The app currently has zero permissions and that is worth preserving |

---

## See also

- [01-architecture-blueprint.md](01-architecture-blueprint.md) — what each layer does
- [03-codebase-setup.md](03-codebase-setup.md) — installing and verifying this toolchain
- [08-design-system.md](08-design-system.md) — the design tokens derived from `improve/tokens.css`