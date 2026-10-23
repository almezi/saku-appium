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
│  │  budgets             │      │ Files (no provider, no share sheet)│     │
│  └──────────────────────┘      │ getExternalFilesDir/               │     │
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
2. **No `FileProvider`, no share sheet.** `writeFile()` targets
   `context.getExternalFilesDir(null)`, which Android 11+ hides from the file
   picker. Exports are effectively device-local and hard to retrieve.
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

- [02-tech-stack-dependencies.md](02-tech-stack-dependencies.md) — versions and why each library is present
- [03-codebase-setup.md](03-codebase-setup.md) — getting the project building
- [06-functional-spec.md](06-functional-spec.md) — the business rules behind this architecture
- [08-design-system.md](08-design-system.md) — tokens and components