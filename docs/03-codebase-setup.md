# 3. Codebase Structure & Developer Setup Guide

Purpose: get a new developer from a clean machine to a running app, and give
them a map of the repository.

Verified against branch `feature/improve-design-2.0`, HEAD `8c7dc3a`.

---

## 3.1 Repository

| | |
|---|---|
| **Remote** | `https://github.com/almezi/SimpleMoneyTracker-KT.git` |
| **Default branch** | `main` (`origin/HEAD → origin/main`) |
| **Visibility / hosting** | GitHub |
| **License** | No LICENSE file in the repository. Treat as private / all rights reserved until one is added |

```bash
git clone https://github.com/almezi/SimpleMoneyTracker-KT.git
cd SimpleMoneyTracker-KT
```

---

## 3.2 Branching strategy

Observed branches:

| Branch | Tip commit | Role |
|---|---|---|
| `main` | `da913d6` | Base line. Well behind — does **not** contain the Saku redesign |
| `develop` | `a09e1f3` | Intermediate line, also behind the feature branch |
| `feature/improve-design-2.0` | `8c7dc3a` | **The shipped work.** 29 commits ahead of `main`, 0 behind |

The intended model, as implied by the branch names and by `AGENTS.md`:

```
main        ← stable, shippable
  │
  └── develop          ← integration
        │
        └── feature/<scope>   ← one branch per piece of work
```

Current divergence: `main..feature/improve-design-2.0` = 29 commits,
`feature/improve-design-2.0..main` = 0. The feature branch is a strict
fast-forward of `main`.

There are **no git tags** in the repository, so there is no released-version
marker on any commit. The shipped `v1.0` exists only as the APK file in
`release/`.

### A branch rule from `AGENTS.md`

> Do not introduce bugs. Any bug work is done separately by hand on another branch.

So: do not fix a defect on a feature branch. Switch branches and do it there.

---

## 3.3 Toolchain requirements

| Requirement | Version | Notes |
|---|---|---|
| **JDK** | **17+** for compiling; **25** in the project IDE | Bytecode target is 17. `.idea/misc.xml` pins `jbr-25` (`languageLevel="JDK_25"`). JDK 25 works |
| **Android SDK Platform** | **API 37** | `compileSdk`/`targetSdk` = 37; platform `android-37.0` must be installed |
| **Build Tools** | 36.0.0 or 37.0.0 | Either is present locally |
| **Android Studio** | Current with AGP 9.4.1 support | Use the bundled JBR so the IDE and Gradle agree on the JDK |
| **Gradle** | 9.7.1 | Supplied by the wrapper — **do not install it separately** |
| **Git** | any recent version | |
| **adb** | from `platform-tools` | for `installDebug` targeting and `pm clear` |
| **Python 3** | optional | only for re-running the launcher-icon generators in `third_party/` |

On macOS the SDK path used by this project is:

```
/Users/auliameiazizi/Library/Android/sdk
```

### Install the SDK bits

```
Settings → Languages & Frameworks → Android SDK
  → SDK Platforms  → check "Android 37.0"
  → SDK Tools       → check "Android SDK Build-Tools 37", "Android SDK Platform-Tools"
```

---

## 3.4 Environment configuration

**There is no `.env` file, and there are no base URLs.**

The app has no backend, no environment switching, and no configuration beyond
`local.properties`. The only environment-specific file is the auto-generated
`local.properties`, which is git-ignored:

```properties
# local.properties  — created by Android Studio, DO NOT COMMIT
sdk.dir=/Users/<you>/Library/Android/sdk
```

Hand-written at the repo root:

| File | Committed? | Purpose |
|---|---|---|
| `local.properties` | **No** — in `.gitignore` twice | SDK location. Machine-specific |
| `gradle.properties` | Yes | Daemon heap, configuration cache, Kotlin style |
| `settings.gradle.kts` | Yes | Repositories, module list |
| `gradle/libs.versions.toml` | Yes | All dependency versions |
| `gradle/wrapper/gradle-wrapper.properties` | Yes | Gradle 9.7.1 |

### Secrets

There are none to configure. No API keys, no tokens, no signing properties,
no credentials file.

If you add a signing config later, read credentials from
`local.properties` (already git-ignored) or the environment — never commit a
`.jks` or a password.

---

## 3.5 First build

```bash
# 1. Verify Gradle picks up the right JDK
./gradlew --version

# 2. Compile everything
./gradlew assembleDebug

# 3. Unit tests
./gradlew testDebugUnitTest
```

If `./gradlew --version` reports the wrong JVM, set `JAVA_HOME`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
# or, to match the IDE:
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

Common first-build problems:

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to find target with hash string 'android-37'` | Platform 37 not installed | Install via SDK Manager |
| `Unsupported class file major version` | JDK too old for AGP 9 | Use JDK 17 or newer |
| Out of memory during compilation | Default heap is 2 GB | `org.gradle.jvmargs=-Xmx4096m` in `gradle.properties` |
| `google()` cannot resolve `androidx.*` | Network/proxy, or repos filtered by `settings.gradle.kts` | Check connectivity; the `includeGroupByRegex` filters only apply to **plugin** resolution, not `dependencyResolutionManagement` |
| Room schema errors after editing an entity | KSP ran against a stale model | `./gradlew clean` then rebuild |

---

## 3.6 Build, test and run commands

```bash
# Build
./gradlew build                          # assemble + unit tests, all variants
./gradlew assembleDebug                  # debug APK
./gradlew assembleRelease                # release APK (UNSIGNED — see below)
./gradlew clean

# Install and run
./gradlew installDebug                   # build + install on the connected device/emulator
adb shell am start -n id.almezi.simplemoneytracker_kt/.MainActivity

# Tests
./gradlew test                           # JVM unit tests
./gradlew testDebugUnitTest              # JVM unit tests, debug variant only
./gradlew connectedAndroidTest           # instrumented tests (needs a device)

# Static checks
./gradlew lint                           # Android Lint
./gradlew lintDebug

# Devices
adb devices
adb shell pm clear id.almezi.simplemoneytracker_kt    # reset app data
adb shell am force-stop id.almezi.simplemoneytracker_kt

# Dependency reports
./gradlew :app:dependencies --configuration debugRuntimeClasspath
```

### Release build note

```bash
./gradlew clean assembleRelease
cp app/build/outputs/apk/release/app-release-unsigned.apk release/SimpleMoneyTrackerKT-v1.0.apk
shasum -a 256 release/SimpleMoneyTrackerKT-v1.0.apk
```

The APK is unsigned because `app/build.gradle.kts` declares no
`signingConfigs`. Android will refuse to install it. For local testing use
`./gradlew installDebug`, which is signed with the standard debug keystore
(`~/.android/debug.keystore`, auto-generated by the SDK).

---

## 3.7 Project layout

```
SimpleMoneyTracker-KT/
├── AGENTS.md                    Standing rules for AI coding tools
├── UI_SPEC.md                   What the app does. Authoritative for scope
├── CATEGORIES.md                Category IDs, columns, countsInTotals rules
├── TESTABILITY.md               Test-tag contract, debug hooks, seed sets
├── README.md                    Build commands, key files, APK download
│
├── build.gradle.kts             Plugin aliases, apply false
├── settings.gradle.kts          Repositories, toolchain resolver, :app
├── gradle.properties            Heap, configuration cache, Kotlin style
├── gradle/libs.versions.toml    All dependency + plugin versions
├── gradlew, gradlew.bat         Wrapper (Gradle 9.7.1)
├── local.properties             SDK path — git-ignored
│
├── app/
│   ├── build.gradle.kts         android { }, dependencies { }
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml      No permissions. One launcher activity
│       │   ├── keepRules/rules.keep     Template only; R8 is disabled anyway
│       │   ├── java/id/almezi/simplemoneytracker_kt/
│       │   │   ├── MainActivity.kt               Theme, nav controller, bottom bar
│       │   │   ├── SimpleMoneyTrackerApp.kt     Application: container + seeding
│       │   │   ├── TestTags.kt                   THE test-tag registry
│       │   │   ├── navigation/NavGraph.kt       Routes, NavHost, bottom nav items
│       │   │   ├── data/                         See below
│       │   │   └── ui/                           See below
│       │   └── res/
│       │       ├── font/                  6 DM Sans / DM Mono TTFs
│       │       ├── values/                strings.xml, colors.xml, themes.xml
│       │       ├── drawable/              launcher layers
│       │       ├── mipmap-anydpi-v26/     adaptive icon
│       │       └── xml/                   backup_rules, data_extraction_rules
│       ├── test/                   JVM unit tests
│       │   └── java/id/almezi/simplemoneytracker_kt/
│       │       ├── ExampleUnitTest.kt
│       │       ├── ui/CategoryFilterTest.kt
│       │       └── ui/designsystem/SakuFormatTest.kt
│       └── androidTest/            instrumented tests (placeholder only)
│
├── improve/                      Design package (input to the redesign)
│   ├── 00-README.md                   How to use the package
│   ├── 01-design-system.md           Components, colors, type, motion
│   ├── 02-screens-and-rules.md       Every screen, state, business rule
│   └── tokens.css                    Design tokens as CSS variables
│
├── third_party/
│   ├── fonts/                        DM Sans, DM Mono sources
│   ├── gen_launcher_bitmap.py        Regenerates launcher PNG layers
│   └── gen_launcher_icon.py          Regenerates the adaptive icon
│
├── release/
│   └── SimpleMoneyTrackerKT-v1.0.apk Unsigned release artifact
│
└── docs/                          THIS documentation set
```

### `data/` — persistence and domain-facing logic

| File | Responsibility |
|---|---|
| `Transaction.kt` | `@Entity` for the `transactions` table |
| `Category.kt` | `@Entity` for the `categories` table |
| `Account.kt` | `@Entity` for the `accounts` table |
| `Budget.kt` | `@Entity` for the `budgets` table |
| `AppDatabase.kt` | Room DB v3, both migrations, `deleteCustomCategoryAtomically` |
| `TransactionDao.kt` | Transaction queries incl. the `SUM` aggregates for Ringkasan/Anggaran |
| `CategoryDao.kt` | Category queries, hide/rename/insert-ignore |
| `AccountDao.kt` | Account queries |
| `BudgetDao.kt` | Budget queries, `REPLACE` upsert |
| `TransactionRepository.kt` | Thin pass-through + `withTransaction` for bulk insert |
| `CategoryRepository.kt` | CRUD, usage counts, duplicate-name check, atomic delete |
| `BudgetRepository.kt` | Upsert that preserves `createdAt` and refreshes `updatedAt` |
| `BackupRepository.kt` | CSV + JSON build, parse, file write, SAF read |
| `Clock.kt` | The one-method time interface |
| `AppContainer.kt` | Manual DI root + `RealClock` |
| `CategorySeed.kt` | 36 categories |
| `AccountSeed.kt` | 3 accounts, `DEFAULT_ACCOUNT_ID = "acc_tunai"` |

### `ui/` — presentation

| Path | Contents |
|---|---|
| `ui/designsystem/` | `SakuColor`, `SakuType`, `SakuDimens`, `SakuFormat`, `SakuTheme`, `SakuBudget`, `SakuTokenPreview` |
| `ui/components/` | 32 public composables — buttons, fields, chips, sheets, toasts, navigation, empty states |
| `ui/tambah/` | `TambahScreen`, `TambahViewModel` |
| `ui/daftar/` | `DaftarScreen`, `DaftarViewModel` |
| `ui/ringkasan/` | `RingkasanScreen`, `RingkasanViewModel` |
| `ui/ubah/` | `UbahTransaksiScreen`, `UbahTransaksiViewModel` |
| `ui/transaction/` | `TransactionForm.kt` — the shared form used by Tambah **and** Ubah |
| `ui/anggaran/` | `AnggaranScreen`, `AnggaranFormScreen` + ViewModels |
| `ui/kategori/` | `KelolaKategoriScreen`, `TambahKategoriScreen` + ViewModels |
| `ui/cadangan/` | `CadanganScreen`, `CadanganViewModel` |
| `ui/CategoryUiMapper.kt` | Category ID → string resource, picker search filtering |

---

## 3.8 Naming conventions

| Layer | Pattern | Example |
|---|---|---|
| Screen composable | `<Feature>Screen` | `TambahScreen`, `DaftarScreen` |
| ViewModel | `<Feature>ViewModel` | `RingkasanViewModel` |
| State | `<Feature>UiState` | `TambahUiState` |
| One-shot event | sealed interface `<Feature>Event` | `TambahEvent.Saved` |
| Repository | `<Entity>Repository` | `BudgetRepository` |
| DAO | `<Entity>Dao` | `TransactionDao` |
| Entity | Singular model name | `Transaction`, `Category` |
| Design token | `Saku<Kind>` | `SakuColors`, `SakuSpace`, `SakuRadius` |
| Shared component | `Saku<Component>` | `SakuPickerSheet`, `SakuToastHost` |
| Route object | `Screen.<Name>` inside `sealed class Screen` | `Screen.Daftar` |
| Test tag constant | `<SCREEN>_<ELEMENT>` | `DAFTAR_EMPTY_STATE` |

Storage values for transaction type are the Indonesian strings
`"pemasukan"` and `"pengeluaran"` (`TransactionType.storageValue`). They are
persisted, referenced in SQL, and compared as raw strings in several DAO
queries. Changing them requires a data migration.

---

## 3.9 Conventions to follow

From `AGENTS.md` and enforced throughout the codebase:

1. **Strings in `strings.xml`,** Indonesian first. No hard-coded UI text.
2. **Never call the system clock directly.** Inject `Clock`. The one call site
   is `RealClock` in `AppContainer.kt`.
3. **Test tags only from `TestTags.kt`,** format `<screen>_<type>_<name>`.
   Never invent, rename or remove one.
4. **Manual DI.** Constructor parameters and `ViewModelProvider.Factory`.
5. **Features must exist in `UI_SPEC.md`.** If it is not in the spec, it does
   not go in the app.
6. **Do not add** settings screens, category editing beyond what exists,
   multi-wallet or multi-currency.
7. **Kotlin official style,** managed by the version catalog.
8. **Do not introduce bugs** as part of feature work.

---

## 3.10 Onboarding checklist

- [ ] Clone the repo, switch to the branch that has the work you need
      (`git branch -a`)
- [ ] Install Android SDK Platform 37 and Build-Tools 37
- [ ] Confirm `./gradlew --version` reports JDK 17 or newer
- [ ] `./gradlew assembleDebug` succeeds
- [ ] `./gradlew testDebugUnitTest` passes
- [ ] `./gradlew installDebug` runs on a device or emulator
- [ ] Read `UI_SPEC.md`, `CATEGORIES.md`, `TESTABILITY.md` (required by `AGENTS.md`)
- [ ] Read `docs/01-architecture-blueprint.md`
- [ ] Learn the design system before touching UI — `docs/08-design-system.md`
- [ ] Note that categories are referenced **by ID** in tests, never by name

---

## See also

- [01-architecture-blueprint.md](01-architecture-blueprint.md) — layer responsibilities
- [02-tech-stack-dependencies.md](02-tech-stack-dependencies.md) — versions in detail