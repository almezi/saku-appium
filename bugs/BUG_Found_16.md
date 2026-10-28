# BUG_Found_16.md — Bug Report 16

## Status

- **State:** Open
- **Summary:** Android `TambahPage.selectCategory()` cannot reach a category-sheet row below the
  initial fold — `UiScrollable.scrollIntoView()` does not scroll the v2.3 Compose sheet, and can
  dismiss it instead. `TC-SUM-12` fails deterministically (2/2 runs); a raw W3C swipe and the
  sheet's own search box both reach the same row.

## Identity

- **Reported by:** Qoder agent (wdio runs + live probe on a local Appium 3.8.0 session)
- **Reported at:** 2026-10-28T05:37:40Z
- **Branch:** feature/implement-ios-automation
- **Commit:** bfeced8

## Test Context

- **Phase:** 1
- **Sub-phase:** 1.E (Summary / Ringkasan)
- **Test case ID:** TC-SUM-12 (primary). Cascading: TC-SUM-11 (its balance assertion includes
  TC-SUM-12's missing expense) and TC-SUM-10 (runs after the sheet failure leaves the flow
  mid-screen). **Confirmed on a second spec:** `TC-EXP-08` fails the same way, same line, on the
  same category sheet — `scrollIntoView(new UiSelector().text("Bahan Bakar"))` "still not
  displayed after 10000ms" — both in the 4-worker `npm run test:tambah` run and solo
  (`/tmp/m5_tambah.log`, `/tmp/m5_exp_solo.log`: 7 passing / 1 failing).
- **Spec file:** src/tests/ringkasan/summary.spec.ts (via `src/helpers/transactions.ts` →
  `TambahPage.fillForm` → `TambahPage.selectCategory`, `src/pageobjects/tambah.page.ts:80-103`)

## Bug Details

### Title
`UiScrollable.scrollIntoView` cannot scroll the Tambah category sheet — categories outside the
initial 9-row window are unreachable, so `selectCategory()` times out

### Description
`selectCategory()` locates sheet rows by rendered text through
`new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text(label))`
— the workaround filed as `BUG_Found-07` (the sheet rows carry no resource-ids). That locator
only works while the wanted row is already composed inside the sheet's viewport.

Measured live 2026-10-28 on emulator-5554 (Pixel_10 / API 37 / app v2.3), expense type selected,
sheet opened from the Tambah category pager. The sheet composes **9** category rows:

`Makanan & Minuman · Belanja Bulanan · Kebutuhan Rumah Tangga · Lainnya (Harian) · Buku / Edukasi
· Kursus / Pelatihan · Lainnya (Pendidikan) · Asuransi · Investasi`

`Transportasi Umum` is **not** in that window (the v2.3 sheet order puts it well below the fold —
it surfaces only after ~4 content-up sweeps). The two proven ways to reach it:

1. **Raw W3C touch swipe** (the mechanism `kategori.page.ts` already standardises): after swipe 4
   the dump contains `Transportasi Umum`, and the sheet stays open the whole time.
2. **The sheet's own search box** (`tambah_category_search`, tag rendered, currently unused by the
   harness): typing `Transportasi` filters to exactly `Pilih Kategori / Transportasi /
   Lainnya (Transportasi) / Transportasi Umum`; tapping the row selects it.

`UiScrollable`, by contrast, does not scroll this list. In the failing probe the selector never
resolved inside 10 s, and the page source afterwards showed the **Tambah form**, not the sheet —
UiScrollable's fling landed on the modal and dismissed it. That second behaviour is why the
suite's failure is not just "slow" but "locator strategy unavailable".

This is a harness defect, not an app defect: the app renders the row and accepts it; only the
chosen scroll mechanism fails. The repo already documents the exact limitation twice over —
`kategori.page.ts:79-85` ("UiScrollable scrollIntoView is unreliable over this list — rows
compose/uncompose mid-fling") and `:100-102` ("not `mobile: scrollGesture` (a silent no-op on
Compose LazyColumns here) and not UiScrollable (unreliable, see `scrollToRow`)"), plus
`progress.md` §1.E for the same finding on Ringkasan. `selectCategory()` is the last significant
UiScrollable consumer on the write path.

### Steps to Reproduce
1. `npm run test:ringkasan` (emulator-5554, Pixel_10, API 37, app v2.3 installed).
2. Let `summary.spec.ts` reach `TC-SUM-12` — it calls `createTransaction({ type:
   'pengeluaran', categoryId: categories.expense.transportPublic })`.
3. Observe the Tambah sheet open on the 9-row window above, then the 10 s timeout.
4. Probe variant (no suite needed): open Tambah, tap the expense toggle, tap
   `tambah_category_pager`, then resolve
   `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Transportasi Umum"))`.

### Actual Result
```
Error: element ("android=new UiScrollable(new UiSelector().scrollable(true))
        .scrollIntoView(new UiSelector().text("Transportasi Umum"))")
       still not displayed after 10000ms
    at async TambahPage.selectCategory (src/pageobjects/tambah.page.ts:96:6)
    at async TambahPage.fillForm (src/pageobjects/tambah.page.ts:145:5)
```
`TC-SUM-11` then fails as a cascade (`Expected: "Rp 1.499.900.000" /
Received: "Rp 1.500.200.000"` — exactly the missing `EXTRA_EXPENSE` of 300 000), and `TC-SUM-10`
fails at `ringkasan.page.ts:221` ("element wasn't found" for `ringkasan_month_switcher_label`)
because the flow is left off-screen. Reproduced 2/2 on `test:ringkasan`: **10 passing / 3
failing** both times, same three cases, same messages.

### Expected Result
Per TESTABILITY.md "CATEGORIES (merged)", `exp_transport_public` = "Transportasi Umum" is a
default, visible category (`true`). `selectCategory()` should bring any contracted category into
view and tap it, as it does for categories inside the initial window.

### Attachment
- `/tmp/m5_ringkasan.log`, `/tmp/m5_ringkasan2.log` — the two identical wdio failures (10/3 each).
- `/tmp/sheet_dump.xml` — page source of the open sheet (the 9-row window).
- `/tmp/probe_out.txt`, `/tmp/sheet_probe2.txt`, `/tmp/probe3.txt`, `/tmp/probe4.txt` — the
  window/search/swipe probes quoted above (throwaway scripts `/tmp/probe_*.js`, Appium 3.8.0
  on :4727, `noReset: true`).
- No screenshot: the failure is a locator absence, not a visual state.

### Severity
Major — a contracted category cannot be selected at all, so any case that uses a below-fold
category is dead; a workaround exists (swipe-and-check or the sheet's search box) and the
affected call sites are few (5 of 65 expense selections in the suite).

### Priority
P1 — blocks 1.E's remaining cases and two further specs on the same mechanism; fix before the
device gate can be considered clean.

## Environment
- **Device/Emulator:** Pixel_10, emulator-5554 (headless, `-gpu auto`)
- **Platform:** Android
- **Appium version:** 3.8.0 (wdio-managed service for the runs; standalone on :4727 for the probes)
- **App build:** installed `versionName=2.3 / versionCode=5`, while `wdio.conf.ts` caps point at
  `resources/SimpleMoneyTrackerKT-v2.2.apk` (`versionCode=4`) — see the note below
- **Android API level:** 37

## Additional Notes

- **Not caused by the M5/M6 timing sweep — proven by A/B, not by argument.** The failing budget
  is `ELEMENT_PRESENT` (10 000 ms), bit-identical to the literal it replaced, and `git diff` on
  `tambah.page.ts` shows `{ timeout: 10_000 }` → `{ timeout: ELEMENT_PRESENT }` and nothing else
  on that path. Beyond that, the whole `src/` tree was swapped for its **pre-sweep** snapshot
  (inline literals back, identical values), the same spec re-run, and the same three TC-SUM
  failures came back: **10 passing / 3 failing**, same ids, same messages
  (`/tmp/ab_sum.log`). The tree was then restored and verified byte-identical. `progress.md`
  §1.E recorded 13/13 green on 2026-10-24 — this is a regression against the *installed build*,
  not against the harness code.
- **Blast radius measured:** the suite names an expense category 65 times in `src/tests` +
  `src/helpers`, spread over five labels — `dailyFood` (51), `dailyOther` (5),
  `dailyGroceries` (4), `transportFuel` (4, two of them iOS), `transportPublic` (1). The three
  `daily*` labels are all inside the sheet's initial 9-row window, so they pass; the two
  `transport*` labels are below the fold, and every Android call site that names one fails:
  `summary.spec.ts:122` (TC-SUM-12, verified), `add-expense.spec.ts:93` (TC-EXP-08, verified),
  `category-management.spec.ts:82` (not yet device-run — same locator, so it will fail on the
  same mechanism). The iOS twins take a different path (`daftar.ios.page.ts:134` already uses a
  bounded swipe-and-retry), which is why this reads as an Android-only defect.
- **Environment trap worth its own decision:** `resources/` ships v2.2 only, and Appium does not
  downgrade an installed package, so every run on this emulator exercises **v2.3** while the caps
  banner prints `SimpleMoneyTrackerKT-v2.2.apk`. `progress.md` §backup already had to pull v2.3
  explicitly via `SAKU_APK`. Either commit a v2.3 APK or make the runner assert that the
  installed `versionName` matches the configured APK — today the mismatch is invisible.
- **Related, filed separately:** `BUG_Found_17.md` — the same sheet renders "Obat-obatan" while
  TESTABILITY.md:302 and `category-labels.ts:43` say "Obat-obat", so `exp_health_medicine` is a
  latent lookup failure in exactly this code path.
- **Fix options, in the order the repo already trusts:**
  1. Reuse the `kategori.page.ts` pattern — swipe-and-check with raw W3C actions (`scrollToRow` /
     `swipeList`), text selector for the row, drop the `UiScrollable` wrapper. Keeps the
     `BUG_Found-07` text-lookup contract intact and matches the iOS twin's "bounded swipe-and-retry"
     note in `daftar.ios.page.ts:134`.
  2. Drive `tambah_category_search` (tags `tambah_category_search` /
     `tambah_category_search_empty` already exist in `src/config/tags.ts:35-36` and are unused),
     then tap the single filtered row. Fewer swipes, no fling side effects, and it is the path a
     real user would take for a deep category.
  In both cases the `it()` should stay unchanged; only `selectCategory()` moves. Re-run
  `test:ringkasan` and `test:tambah` after.
