# 1. Architecture & Technical Blueprint

Purpose: explain how the app is built so a future engineer does not have to
reverse-engineer the codebase.

Verified against branch `feature/improve-design-2.0`, HEAD `8c7dc3a`.

---

## 1.1 Architecture pattern

**MVVM with unidirectional data flow, backed by an observable local database.**

The full chain mandated by `AGENTS.md` and implemented in the code:

```
UI (Jetpack Compose)
  → ViewModel (StateFlow of an immutable UiState)
    → Repository (plain Kotlin class)
      → DAO (Room)
        → SQLite
```

There is **no** Clean Architecture layering (no domain/use-case layer),
**no** BLoC, and **no** Redux-style store. Those were not chosen; the repo's
standing rules in `AGENTS.md` require MVVM, and nothing in the code goes
further than Repository → DAO.

### Deviations worth knowing

| Thing | What the code actually does | Why it matters |
|---|---|---|
| Repository layer is thin | `TransactionRepository`, `CategoryRepository`, `BudgetRepository` mostly forward calls to DAOs and add multi-table transactions | Query logic that spans tables lives here (e.g. `insertTransactions` wraps `withTransaction`) |
| No use-case / domain layer | Business rules live in **ViewModels** and in `ui/designsystem/SakuFormat.kt` | Amount parsing, savings rate, budget status thresholds are all pure functions or ViewModel logic, not a domain module |
| Aggregation happens in two styles | `Ringkasan`/`Anggaran` use SQL `SUM` aggregates in DAOs; `Daftar` loads all rows and groups in the ViewModel | `DaftarViewModel.rebuild()` filters and groups in memory. Fine at this data volume; do not copy the pattern into a list that could grow large |

### Hard rules from `AGENTS.md` (do not break these)

1. **Manual DI only.** No Hilt, no Koin. `data/AppContainer.kt` constructs everything.
2. **Injectable clock.** Never call `System.currentTimeMillis()` outside
   `data/AppContainer.kt:47` (`RealClock`). Everything else takes `Clock`.
3. **Strings live in resources.** Indonesian first. No hard-coded UI text.
   (`SakuFormat.kt` has two deliberate exceptions: `SAKU_AMOUNT_PLACEHOLDER = "Rp 0"`
   and `SAKU_NO_DATA = "—"`.)
4. **No network layer, no login, no analytics.**
5. **Test tags come only from `TestTags.kt`.** Never invent or rename one.

---

## 1.2 System diagram

The app has **no backend**. It never opens a socket. The only I/O boundaries
are the local database, `SharedPreferences`, the app's own external files
directory, and the system file picker (import only).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              ANDROID DEVICE                               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  PRESENTATION — Jetpack Compose (dark-only, Material 3)            │  │
│  │                                                                    │  │
│  │  MainActivity ──► SakuLoadingScreen ──► NavGraph (NavHost)         │  │
│  │                      ▲                                             │  │
│  │                      │ collects app.isReady (StateFlow)            │  │
│  │                                                                    │  │
│  │  Screens (9)         │        Components (ui/components, Saku*)    │  │
│  │  ├─ Tambah           │          PrimaryButton, SelectField,        │  │
│  │  ├─ Daftar           │          SegmentedToggle, SakuPickerSheet,  │  │
│  │  ├─ Ringkasan        │          TransactionCard, BudgetProgressRow │  │
│  │  ├─ Ubah transaksi   │          MonthSwitcher, SakuToast, ...      │  │
│  │  ├─ Kelola kategori  │                                             │  │
│  │  ├─ Tambah kategori  │        Design tokens (ui/designsystem)      │  │
│  │  ├─ Anggaran         │          SakuColors, SakuTextStyles,        │  │
│  │  ├─ Anggaran form    │          SakuSpace/Radius/Size/Motion,     │  │
│  │  └─ Cadangan         │          SakuFormat (money + date logic)    │  │
│  │                      ▼                                             │  │
│  │            ┌───────────────────────────────────┐                  │  │
│  │            │  VIEWMODEL — androidx.lifecycle    │                  │  │
│  │            │  TambahUiState, DaftarUiState,    │                  │  │
│  │            │  RingkasanUiState, AnggaranUiState│                  │  │
│  │            │  MutableStateFlow → StateFlow     │                  │  │
│  │            │  MutableSharedFlow → SharedFlow   │                  │  │
│  │            │  (one-shot events: toasts, sheets)│                  │  │
│  │            │  inner class Factory (manual DI)  │                  │  │
│  │            └───────────────┬───────────────────┘                  │  │
│  └────────────────────────────┼──────────────────────────────────────┘  │
│                               │ constructor injection                   │
│  ┌────────────────────────────▼──────────────────────────────────────┐  │
│  │  DATA — plain Kotlin, no framework                                │  │
│  │                                                                    │  │
│  │  AppContainer ── manual object graph (the DI root)                │  │
│  │  ├── Clock (interface) ──► RealClock (only system-clock call)     │  │
│  │  ├── TransactionRepository                                        │  │
│  │  ├── CategoryRepository                                           │  │
│  │  ├── BudgetRepository                                             │  │
│  │  └── BackupRepository (CSV/JSON in, CSV/JSON out)                 │  │
│  │  ├── AccountDao      ┐                                            │  │
│  │  ├── BudgetDao       │                                            │  │
│  │  ├── CategoryDao     ├─► AppDatabase (Room, version 3)           │  │
│  │  └── TransactionDao  ┘        ├── MIGRATION_1_2 (accounts)        │  │
│  │                              ├── MIGRATION_2_3 (budgets + columns)│  │
│  │                              └── deleteCustomCategoryAtomically() │  │
│  │                                                                    │  │
│  │  Seeds: CategorySeed (36) · AccountSeed (3) — idempotent inserts  │  │
│  └──────────┬──────────────────────────────────┬──────────────────��───┘  │
│             │                                  │                          │
│  ┌──────────▼───────────┐      ┌───────────────▼────────────────────┐   │
│  │ SQLite               │      │ SharedPreferences "saku_backup"    │   │
│  │ simplemoneytracker.db│      │  last_backup_millis (Long)         │   │
│  │  transactions        │      └────────────────────────────────────┘   │
│  │  categories          │                                                  │
│  │  accounts            │      ┌────────────────────────────────────┐     │
│  │  budgets             │      │ cache/backups + share sheet (v2.2) │     │
│  └──────────────────────┘      │ (live-verified 2026-10-25; was      │     │
│                                │  getExternalFilesDir/Files)         │     │
│                                │  saku-cadangan.csv / .json         │     │
│  ┌──────────────────────┐      │ SAF OpenDocument ──► read only     │     │
│  │ SimpleMoneyTrackerApp│      └────────────────────────────────────┘     │
│  │ (Application)        │                                                  │
│  │  container: AppContainer                                                │
│  │  isReady: StateFlow  │                                                  │
│  └──────────────────────┘                                                  │
└──────────────────────────────────────────────────────────────────────────┘

X  NO backend APIs, NO auth, NO push, NO analytics, NO crash reporting
   There is no INTERNET permission in AndroidManifest.xml — the app cannot
   reach the network even by accident.
```

### Why the loading screen exists

`SimpleMoneyTrackerApp.onCreate()` seeds 36 categories and 3 accounts on a
background coroutine and then sets `_isReady = true`. `MainActivity` shows
`SakuLoadingScreen` until that flag flips, with a minimum on-screen duration of
`SakuMotion.loadingMinimumMillis` (1200 ms) so the logo does not flash. The
elapsed time is measured with `SystemClock.elapsedRealtime()` — that is
animation timing, not domain time, so it deliberately bypasses the `Clock`
abstraction.

---

## 1.3 Navigation graph

Defined in `navigation/NavGraph.kt` as a sealed class of `Screen` objects with
route strings. Bottom bar has three items; the app opens on Tambah.

```
            ┌──────────────────────────────────────┐
            │  Tambah  (start destination)         │
            └───┬──────────────────────────────┬───┘
                │ "Kelola kategori"            │
                ▼                              │
        ┌───────────────┐                      │
        │ Kelola        │◄─────────────────┐    │
        │ kategori      │                  │    │
        └───────┬───────┘           "Kelola kategori"
                │ "Tambah kategori"          │  (also from Ringkasan)
                ▼                          │
        ┌───────────────┐                  │
        │ Tambah        │                  │
        │ kategori      │                  │
        └───────────────┘                  │
                                           │
   ┌───────────────────────────────────────┴────────────────────────┐
   │  (bottom navigation bar — Tambah │ Transaksi │ Ringkasan)    │
   └───────┬───────────────────────────────────────┬───────────────┘
           │                                       │
           ▼                                       ▼
   ┌───────────────┐                        ┌──────────────┐
   │ Daftar        │                        │ Ringkasan    │
   │ (Transaksi)   │                        └──────┬───────┘
   └───┬───────┬───┘                               │ "Anggaran"
       │       │ "Cadangan & ekspor data"          ▼
       │       │                            ┌──────────────┐
       │       ▼                            │ Anggaran     │
       │  ┌─────────────┐                   └──────┬───────┘
       │  │ Cadangan    │                          │ add / edit
       │  └─────────────┘                          ▼
       │                                     ┌──────────────┐
       │ "Ubah" (row action)                  │ AnggaranForm │
       ▼                                     │ ?categoryId= │
  ┌──────────────────────┐                  └──────────────┘
  │ UbahTransaksi        │
  │ /{transactionId}     │
  └──────────────────────┘
```

Routes:

| Screen | Route string |
|---|---|
| Tambah | `tambah` |
| Daftar | `daftar` |
| Ringkasan | `ringkasan` |
| Kelola kategori | `kelola_kategori` |
| Tambah kategori | `tambah_kategori` |
| Anggaran | `anggaran` |
| Anggaran form | `anggaran/form?categoryId={categoryId}` (arg nullable) |
| Cadangan | `cadangan` |
| Ubah transaksi | `ubah_transaksi/{transactionId}` |

The bottom bar is rendered by `MainActivity`, not by `NavGraph`. It is only
composited when `currentRoute in bottomNavRoutes` — every non-tab destination
shows a back button instead, exactly as `UI_SPEC.md` §4 requires. Tab switching
uses `popUpTo(startDestinationId) { saveState = true }` +
`launchSingleTop` + `restoreState`, so each tab keeps its scroll position and
its selected month.

---

## 1.4 Data flow

### Layer contracts

| Layer | Package | Contract |
|---|---|---|
| UI | `ui/<feature>/` | Composable functions. Stateless where possible. Read `StateFlow` with `collectAsState()`, send intents to the ViewModel via lambdas. |
| ViewModel | `ui/<feature>/` | Owns one immutable `…UiState` data class, exposes it as `StateFlow`, exposes one-shot effects as `SharedFlow`. All `suspend` work in `viewModelScope`. |
| Repository | `data/` | Plain class. Holds DAOs + `AppDatabase` + sometimes `Clock`. Owns cross-DAO transactions. Returns `Flow` for streams, `suspend` for one-shots. |
| DAO | `data/` | Room `@Dao` interface. `Flow` for observed queries, `suspend` for writes and one-shot aggregates. |

### Example: saving a transaction (Tambah)

```
User types "212121"
  └► AmountInput(onValueChange)          [ui/components/SakuFields.kt]
      └► TransactionForm(state.amountDigits, onAmountChange)  [ui/transaction]
          └► TambahViewModel.updateAmount(digits)  → _uiState.update { it.copy(amountDigits = digits) }
              └► StateFlow emits new TambahUiState
                  └► TransactionForm recomposes; SakuFormat.formatRupiahFromDigits
                     renders "Rp 212.121"; PrimaryButton re-evaluates state.canSave

User taps "Simpan transaksi"
  └► TambahViewModel.save()
      ├─ guard: state.canSave (amount in range AND category != null AND !isSaving)
      ├─ _uiState.update { it.copy(isSaving = true) }
      └─ viewModelScope.launch {
           repository.insertTransaction(Transaction(..., createdAt = clock.currentTimeMillis()))
             └─ TransactionDao.insert(tx) → SQLite (suspend, Room dispatches to its executor)
           onSuccess → clear amountDigits, selectedCategoryId, note; keep account + date
                       _events.tryEmit(TambahEvent.Saved)
           onFailure → _events.tryEmit(TambahEvent.SaveFailed)
         }

UI collects events in a LaunchedEffect → shows SakuToast "Transaksi disimpan"
and never navigates (per UI_SPEC §6.1 "Saving never leaves the screen")
```

### Reactive vs. pull

| Screen | Pattern | Reason |
|---|---|---|
| Tambah categories & accounts | `Flow` from repository → `collect` into StateFlow | Category list and account list change rarely but should stay fresh |
| Daftar | `Flow` of **all** transactions → filtered/grouped in `rebuild()` | Month switching re-groups the same set |
| Ringkasan | Pull. `refresh(month)` issues four `suspend` aggregate queries | Month navigation is an explicit user action; no live subscription needed |
| Anggaran | Pull. `refresh()` reads budgets `.first()` + per-category spend | Avoids re-running N aggregates on every unrelated write |
| Cadangan | Pull for counts and exports; one-shot `import()` | Import is an explicit command |

**Cache strategy:** there is no cache layer. Room *is* the single source of
truth. The only in-memory caching is the Flow buffers inside Room and the
StateFlow owned by each ViewModel. Two screens can hold different
`SakuMonth` values at the same time — Daftar may show October while Ringkasan
shows September. That is intentional, not a bug: each tab owns its own state,
and `restoreState = true` keeps it alive.

---

## 1.5 State management details

### Per-screen state objects

| ViewModel | State type | Notable fields |
|---|---|---|
| `TambahViewModel` | `TambahUiState` | `type`, `amountDigits: String`, `selectedCategoryId`, `selectedAccountId`, `dateMillis`, `note`, `isSaving` + derived `canSave` |
| `UbahTransaksiViewModel` | — | pre-filled form, dirty tracking so "Simpan perubahan" enables only on real change |
| `DaftarViewModel` | `DaftarUiState` | `month: SakuMonth`, `days: List<TransactionDay>`, `incomeTotal`, `expenseTotal`, `pendingDelete`, `undoCandidate` |
| `RingkasanViewModel` | `RingkasanUiState` | `month`, `loading`, `balance`, `income`, `expense`, `incomeByCategory`, `expenseByCategory` |
| `AnggaranViewModel` | `AnggaranUiState` | `rows: List<BudgetRow>`, `totalLimit`, `totalSpent`, `pendingDelete` |
| `AnggaranFormViewModel` | — | category select, limit, `alertAt80` (default on), create vs edit mode |
| `KelolaKategoriViewModel` | `KelolaKategoriUiState` | `type`, `rows: List<CategoryRow>`, `pendingDelete: DeleteCategoryRequest?` |
| `TambahKategoriViewModel` | `TambahKategoriUiState` | `type`, `name`, `colorHex`, `nameError`, `saved` |
| `CadanganViewModel` | `CadanganUiState` | `transactionCount`, `lastBackupMillis`, `importing`, `importResult`, `importError`, `toast` |

### State conventions

- **Amounts are held as digit strings, not numbers.** `amountDigits: String`
  plus `parseAmountDigits()`. This keeps the raw user input for the field and
  the `Long` for the database derived, and it caps input at 12 digits at the
  source.
- **One-shot effects use `SharedFlow`, not state.** `TambahEvent.Saved`,
  `TambahEvent.SaveFailed`. A toast must not replay on configuration change,
  so it is not part of `UiState`.
- **Confirmation is modelled as pending state.** `pendingDelete: Transaction?`
  / `pendingDelete: BudgetRow?` / `pendingDelete: DeleteCategoryRequest?`. The
  sheet is a pure function of that field.
- **Derived values are computed properties, not fields.** `canSave`,
  `hasAmount`, `hasCategory`, `isEmpty`, `hasTransactions`, `isNegative`,
  `nameValid`. They cannot go stale.
- **Undo is UI-level, implemented as re-insert.** `DaftarViewModel.confirmDelete()`
  deletes and keeps the row in `undoCandidate`; `undoDelete()` calls
  `repository.restoreTransaction(tx)`. This gives a new auto-generated `id` —
  a known, accepted tradeoff, see `UI_SPEC.md` §8 known gaps.

### One-shot event pattern

```kotlin
private val _events = MutableSharedFlow<TambahEvent>(extraBufferCapacity = 1)
val events: SharedFlow<TambahEvent> = _events.asSharedFlow()
// emit: _events.tryEmit(TambahEvent.Saved)
```

Use `tryEmit` (never `emit`) so the repository/database call can never suspend
or throw from the emit site.

---

## 1.6 Threading model

| Work | Dispatcher / mechanism |
|---|---|
| Seeding at app start | `SimpleMoneyTrackerApp.applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)` |
| ViewModel work | `viewModelScope` (Main dispatcher) — suspend DAO/Flow calls switch threads themselves |
| Room queries | Room's own transaction executor; `suspend` DAO functions do not block the caller |
| Repository `withTransaction` blocks | `RoomDatabase.withTransaction`, which owns its own dispatcher |
| Export/import (string building, file write) | `viewModelScope` + `runCatching`; the write is a blocking `File.writeText` and should be understood as such |

`SupervisorJob` on the application scope means one failing seed insert does not
cancel the others.

---

## 1.7 Dependency injection

`AppContainer` is the entire object graph, built eagerly in
`SimpleMoneyTrackerApp.onCreate()`:

```kotlin
class AppContainer(context: Context) {
    private val database = Room.databaseBuilder(context, AppDatabase::class.java,
                                                "simplemoneytracker.db")
        .addMigrations(*AppDatabase.ALL_MIGRATIONS)
        .build()

    val transactionDao = database.transactionDao()
    val categoryDao     = database.categoryDao()
    val accountDao      = database.accountDao()
    val budgetDao       = database.budgetDao()
    val clock: Clock    = RealClock()

    val transactionRepository = TransactionRepository(database, transactionDao, categoryDao, accountDao)
    val categoryRepository    = CategoryRepository(database, categoryDao, transactionDao)
    val budgetRepository     = BudgetRepository(database, budgetDao, clock)
    val backupRepository     = BackupRepository(transactionRepository, categoryRepository,
                                                  budgetRepository, accountDao)
}
```

Screens reach it by casting the application context:

```kotlin
val container = (LocalContext.current.applicationContext as SimpleMoneyTrackerApp).container
val viewModel: TambahViewModel = viewModel(factory = TambahViewModel.Factory(container.transactionRepository, container.clock))
```

Every ViewModel carries an `inner class Factory : ViewModelProvider.Factory`.
To swap in a fake clock for a test, construct the ViewModel with a different
`Clock` — no DI framework needed.

Note: `AppDatabase` uses `exportSchema = false`, so no `schemas/` directory is
generated and migrations are **not** validated by `MigrationTestHelper`
automatically. `UI_SPEC.md` §8 states migrations were verified by hand against
a database that already held data.

---

## 1.8 Database

`AppDatabase`, Room, **version 3**, four entities.

### Schema

```
transactions
  id               INTEGER PK autoincrement
  type             TEXT      NOT NULL   -- 'pemasukan' | 'pengeluaran'
  amount           INTEGER   NOT NULL   -- whole rupiah, Long
  categoryId       TEXT      NOT NULL   -- FK by convention (no Room @ForeignKey)
  accountId        TEXT      NOT NULL   -- default 'acc_tunai'
  dateEpochMillis  INTEGER   NOT NULL   -- midnight Asia/Jakarta
  note             TEXT      nullable   -- max 60 chars
  createdAt        INTEGER   NOT NULL   -- from injected Clock

categories
  id              TEXT PK    NOT NULL
  nameRes         TEXT       NOT NULL
  groupId         TEXT       nullable
  countsInTotals  INTEGER    NOT NULL   -- Boolean
  type            TEXT       NOT NULL
  colorHex        TEXT       nullable
  isDefault       INTEGER    NOT NULL   -- Boolean
  isHidden        INTEGER    NOT NULL   -- Boolean
  customName      TEXT       nullable

accounts
  id         TEXT PK NOT NULL
  name       TEXT    NOT NULL
  sortOrder INTEGER NOT NULL

budgets
  categoryId   TEXT PK    NOT NULL
  limitAmount  INTEGER    NOT NULL
  alertAt80    INTEGER    NOT NULL  -- Boolean
  createdAt    INTEGER    NOT NULL
  updatedAt    INTEGER    NOT NULL
```

There are **no Room `@ForeignKey` constraints**. Referential integrity is
maintained in application code — most importantly in
`AppDatabase.deleteCustomCategoryAtomically()`.

### Migrations

| Migration | Work | Data safety |
|---|---|---|
| `MIGRATION_1_2` | Creates `accounts`; adds `transactions.accountId TEXT NOT NULL DEFAULT 'acc_tunai'` | Existing rows get the default account, never NULL |
| `MIGRATION_2_3` | Adds `categories.colorHex`, `isDefault DEFAULT 1`, `isHidden DEFAULT 0`, `customName`; creates `budgets` | `CREATE TABLE IF NOT EXISTS` + defaulted columns, all additive |

Never use destructive fallback. If you add a version 4, add `MIGRATION_3_4` and
register it in `ALL_MIGRATIONS`.

### Multi-table writes

`AppDatabase.deleteCustomCategoryAtomically(categoryId, fallbackCategoryId)`
runs one `withTransaction`:

```
1. transactionDao.moveCategory(categoryId, fallbackCategoryId)
   UPDATE transactions SET categoryId = :to WHERE categoryId = :from
2. budgetDao.delete(categoryId)
3. categoryDao.delete(categoryId)
```

Also wrapped in `withTransaction`: `TransactionRepository.insertTransactions()`
(bulk import). If you add a write that spans tables, follow this pattern.

### Seeds

Both seed objects are inserted with `OnConflictStrategy.IGNORE`, so they are
idempotent across every app launch:

- `CategorySeed.all` — 36 categories (9 income, 27 expense)
- `AccountSeed.all` — 3 accounts: `acc_tunai` / Tunai (sort 0, the default),
  `acc_bca` / BCA (1), `acc_gopay` / GoPay (2)

After inserting categories, `onCreate()` calls
`categoryRepository.assignColorIfMissing(seed.id, SakuCategoryPalette.hexFor(seed.id))`.
The SQL is `WHERE id = :id AND colorHex IS NULL`, so a color a user already
picked is never overwritten.

---

## 1.9 Error handling

| Situation | Handling |
|---|---|
| DB write fails on Tambah | `runCatching { … }.onFailure { _events.tryEmit(TambahEvent.SaveFailed) }` → toast `toast_gagal_menyimpan` |
| Import file unreadable / not Saku JSON | `runCatching { parseJson(rawText) }.getOrNull()` returns null → `importError = true` → `cadangan_import_error` |
| Import insert fails | same `runCatching` path → `importError = true` |
| Category name too long | `TambahKategoriViewModel.updateName` silently returns if `name.length > CATEGORY_NAME_MAX` |
| Duplicate category name | `countWithName(type, name, excludeId) > 0` → `nameError = true`, save blocked |
| Missing `applicationContext` cast | Not defended against; every screen does the cast unchecked |

There is no global crash handler and no crash reporter. No bug is introduced
deliberately — `AGENTS.md` forbids it, and defect work happens by hand on a
separate branch.

---

## 1.10 Testability architecture

This matters more here than in a normal app: the project exists to be driven
by an external automation suite. `TESTABILITY.md` is the contract.

### Locator rule

**Never locate by visible text. Locate only by test tag.** Every tag is a
`const val` in `TestTags.kt`, format `<screen>_<type>_<name>`. The AI never
renames, removes or invents tags.

The implemented set differs from the draft list in `TESTABILITY.md` §"Current
Test Tags Implementation" — the shipped file has ~110 tags including
`component_*` entries for shared components. Treat `TestTags.kt` as the
authority, `TESTABILITY.md` as the intent.

Tags are applied with `Modifier.testTag(...)`, typically on the **root** Box or
Column of a screen (`TAMBAH_SCREEN`, `DAFTAR_SCREEN`, `CADANGAN_SCREEN`) and on
each interactive element. Per-item tags use a prefix constant; the row identity
is appended at the call site so the automation suite can address a specific
transaction or category.

### Debug-only hooks

| Need | Mechanism | Status |
|---|---|---|
| Seed data | Intent extra `test_seed` = seed set name (`seed_empty`, `seed_month_mixed`, `seed_excluded_categories`, `seed_month_boundaries`, `seed_same_day_ordering`) | **Not implemented.** No intent-extra handling exists in `MainActivity`. |
| Reset state | `adb shell pm clear id.almezi.simplemoneytracker_kt` | **Works** — clears the Room DB and all SharedPreferences |
| Fake clock | Intent extra `test_now` = ISO local date-time, e.g. `2026-09-15T10:00` | **Not implemented.** `AppContainer` always installs `RealClock`. |

Because the fake-clock and seed hooks do not exist, release and debug builds
currently behave identically apart from debug signing. Implementing them must
be gated on the build type so they never reach a release build
(`AGENTS.md`: "Debug-only hooks must not exist in release builds"), and
`buildConfig = true` would be needed in `app/build.gradle.kts` to gate on
`BuildConfig.DEBUG` — it is currently off, so `BuildConfig` is not even
generated.

### Tests that exist

| File | Scope |
|---|---|
| `app/src/test/.../SakuFormatTest.kt` | Currency formatting, grouping, range checks |
| `app/src/test/.../ui/CategoryFilterTest.kt` | Category picker search: match rules, case-insensitivity, group pruning |
| `app/src/test/.../ExampleUnitTest.kt` | Template placeholder |
| `app/src/androidTest/.../ExampleInstrumentedTest.kt` | Template placeholder — asserts the package name only |

**There are no real instrumented UI tests.** The UI is verified by hand, not by
`connectedAndroidTest`. This is recorded in `UI_SPEC.md` §8.

---

## 1.11 Where to make changes

| Task | Files |
|---|---|
| Add a screen | `navigation/NavGraph.kt` (route + composable), new `ui/<feature>/` package, optionally add to `bottomNavItems` |
| Change money or date behavior | `ui/designsystem/SakuFormat.kt` — the single source for parsing, formatting, month math |
| Change a color, font, spacing, radius, duration | `ui/designsystem/SakuColor.kt` / `SakuType.kt` / `SakuDimens.kt` |
| Add a DB column | Entity file, then a new `Migration(n-1, n)` in `AppDatabase.kt`, registered in `ALL_MIGRATIONS`, and bump `version` |
| Add a category | `CATEGORIES.md` first, then `CategorySeed.kt`, then `CategoryUiMapper.kt`, then `strings.xml`. Tests reference categories by ID, never by name |
| Add a testable element | Add the `const val` to `TestTags.kt`, then `Modifier.testTag()` at the usage site |
| Change the database schema shape | Check `CATEGORIES.md` rules: `countsInTotals`, `isDefault`, `isHidden`, `customName` |

---

## 1.12 Known architectural gaps

Documented in `UI_SPEC.md` §8, restated here because they affect architecture
work:

1. **CSV import is not implemented.** `BackupRepository.parseJson` only parses
   JSON. A CSV file reaches the `"File tidak valid"` error path. The CSV error
   message therefore names a format the importer cannot read.
2. **Share sheet: resolved as of v2.2** (live-verified 2026-10-25 on the built
   APK): export writes `cache/backups/saku-cadangan.csv|.json` in private
   storage and then opens the system share sheet
   (`com.android.intentresolver`); the file is also retrievable via
   `adb shell run-as`. The older description here (`writeFile()` targeting
   `getExternalFilesDir(null)`, no share sheet) predates that — re-sync this
   section against the app repo source before doing architecture work in
   this area.
3. **`BackupRepository.parseJson` returns `emptyList()` for accounts.** Look at
   line 179 — `BackupData(transactions, categories, emptyList(), budgets)`.
   Accounts in an import file are silently dropped. This is a data-loss path on
   import.
4. **Export writes only custom categories.** `buildBackup()` filters
   `!it.isDefault`, so a renamed *default* category exports its row without the
   rename.
5. **`createdAt` is not round-tripped.** Export omits it; import defaults it to
   `0L`. Re-imported transactions therefore lose their intra-day ordering and
   sort last within their day.
6. **`DaftarViewModel` loads the entire transaction table into memory** and
   filters per rebuild. Fine for a personal tracker; would not scale.
7. **Seed colors are hash-derived.** `SakuCategoryPalette.hexFor()` uses
   `categoryId.hashCode()`. Stable per ID, but arbitrary rather than curated.
8. **No schema export** (`exportSchema = false`), so migrations are not
   regression-tested automatically.

---

## See also

- [Tech Stack & Dependency Manifest](#2-tech-stack--dependency-manifest) (this file, §2) — versions and why each library is present
- [Codebase Structure & Developer Setup](#3-codebase-structure--developer-setup-guide) (this file, §3) — getting the project building
- [UI_SPEC.md](../UI_SPEC.md) — the business rules behind this architecture
- [DESIGN.md](DESIGN.md) — tokens and components
---

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
   [§1.10 Testability architecture](#110-testability-architecture) above).

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

- [Architecture Blueprint](#1-architecture--technical-blueprint) (this file, §1) — what each layer does
- [Codebase Structure & Developer Setup](#3-codebase-structure--developer-setup-guide) (this file, §3) — installing and verifying this toolchain
- [DESIGN.md](DESIGN.md) — the design tokens derived from `improve/tokens.css`
---

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
- [ ] Read `UI_SPEC.md`, `TESTABILITY.md` (incl. its CATEGORIES section) — required by `AGENTS.md`
- [ ] Read this file's [Architecture Blueprint](#1-architecture--technical-blueprint) (§1)
- [ ] Learn the design system before touching UI — [docs/DESIGN.md](DESIGN.md)
- [ ] Note that categories are referenced **by ID** in tests, never by name

---

## See also

- [Architecture Blueprint](#1-architecture--technical-blueprint) (this file, §1) — layer responsibilities
- [Tech Stack & Dependency Manifest](#2-tech-stack--dependency-manifest) (this file, §2) — versions in detail
---

