# Code Review Record — `saku-appium`

Closing summary of the **2026-10-24 review** (a `ringkasan.page.ts` deep-dive graded B+/A−, plus a project-wide five-axis quality and security review graded B/B+). All actionable findings were remediated on **2026-10-25** in an orchestrated pass. The full original findings and per-fix annotations live in this file's committed predecessor (git history) — this document is the durable record; anything not listed as open below is fixed.

---

## Status at a glance

| Area | State |
|---|---|
| Critical findings (C1–C3) | ✅ all fixed |
| Required findings (R1–R9) | ✅ 8 fixed; R1 partially (enhancement open) |
| `ringkasan.page.ts` findings 1–8, steps 1–10 | ✅ all fixed |
| Optional/nit tier (O1–O6, N1–N4) | O1 done; O2 deferred by decision; O3–O6 + N1–N3 open at discretion; N4 kept as-is |
| Security conditions | ✅ `appium-mcp` pinned; dependency-deferral policy documented below |
| Verification | ⚠️ static only — `tsc --noEmit` clean, unit tests 17/17. **No device run yet** (see Device gate) |

---

## Fixes landed (2026-10-25)

| Area | Change |
|---|---|
| **Page-object decoupling** | `readAmount`, `extractChildTexts`, `barFillRatio` moved/created in `src/helpers/elements.ts`; no page object imports another except `ubah ← DaftarPage` (O6, open) |
| **Robustness** | `switchMonth` settle-wait + unmasked label reads in both `daftar` and `ringkasan`; `rowTexts` wrapped in the 3-attempt retry; `waitForExist` guard + exact-2 bar-view guard in `breakdownBarRatio` |
| **Type honesty** | `as unknown as Element[]` cast removed (spread idiom — in WDIO v9 the `$$` chainable's `length` is `Promise<number>`); `src/types.ts` is now the single `webdriverio` import point |
| **Spec blockers (C1/C2)** | `budget.spec.ts` TC-BUD-08/09 and `category-management.spec.ts` TC-KAT-11 navigation repaired; bonus same-class fix in TC-KAT-02. These were *test-code* bugs — no `BUG_FOUND.md` entry required by the AGENTS.md protocol |
| **Config & supply chain** | Screenshot hook actually works now (`onPrepare` mkdir + logged catch); mocha timeout 20 min → 180 s; `typecheck` script; `engines` + `.nvmrc` (24); `.idsig` untracked; `appium-mcp` pinned to `1.97.1` |
| **Consolidation** | One verified-retrying `typeIntoTaggedField` in `helpers/input.ts` (3 typing copies deleted; throws instead of falling through to Save). One `extractChildTexts` loop everywhere (deliberate exceptions: `rowAmountTextsInOrder`'s per-row Rp selection, and a skipped spec needing element handles) |
| **Hygiene** | Dead `cadangan.page.ts` deleted; dead exports removed (grep-verified; `allByTag` correctly kept — the fixes made it live); 12 magic tag strings → `tags.*`; 3 uncatalogued tags added to `anggaran`'s local map |
| **Money parsing** | `parseAmountText` sign bug fixed — sign now read from the gap before the *last* numeric run, so mixed-sign comparison rows parse correctly; 17/17 unit tests, no skips |

---

## Open items

1. **R1 enhancement** — `switchMonth` (both files) verifies the label *changed*; assert the *target* label instead. `src/pageobjects/daftar.page.ts`, `src/pageobjects/ringkasan.page.ts`
2. **O2 junit reporter** — blocked on installing `@wdio/junit-reporter`; dependency adds require explicit approval. One-line reporters config once approved
3. **O3** — `tambah` category-sheet scroll bound is a magic `8 × 45%`; compute from sheet height or try `scrollToTagMatches` first. `src/pageobjects/tambah.page.ts`
4. **O4** — TC-INC-09 re-implements `save()` inline; call `tambah.save()`. `src/tests/tambah/add-income.spec.ts`
5. **O5** — `tsconfig.json` `types` has redundant `webdriverio` + `@wdio/globals/types`; consider `noUncheckedIndexedAccess` (will surface `texts[0]`-style fixes)
6. **O6** — `ubah.openFromDaftar(daftar: DaftarPage, …)` couples page objects; instantiate internally or move into the spec
7. **N1** — `navigation.spec.ts` mixes bare `waitForDisplayed()` (15 sites) with `expect(...)`; pick one house style. **N2** — convoluted `Array.from({length:20})` loop. **N3** — 3 `as WebdriverIO.Element` casts after `toBeDefined()` guards
8. **Device verification gate** — a first emulator run must confirm: the Phase 2 spec navigation fixes (budget/category specs remain never-executed), the exact-2 bar-view guard in TC-SUM-09, and the consolidated daftar reads (`test:anggaran`, `test:kategori`, `test:transaksi`, `test:ringkasan`)

---

## Standing decisions & policies

- **Dependency deferrals:** `shell-quote` (via appium) and `sharp` (via uiautomator2-driver) accepted as low-reachability in this localhost harness. Re-audit on every appium/driver upgrade; next scheduled review **2027-01-25**. **Never** run `npm audit fix --force` — the "fix" downgrades appium 3.x → 2.19.
- **Bar-view guard fallback:** if TC-SUM-09 fails with "has no measurable bar views", the row renders extra Views — relax `viewList.length !== 2` to `length < 2` in `ringkasan.breakdownBarRatio` (one-character change).
- **Dependency changes** (e.g. O2's junit reporter) require explicit approval; the supply-chain posture of this review is the reason.

---

## Where things live now

- `src/helpers/elements.ts` — `extractChildTexts`, `readAmount`, `barFillRatio`
- `src/helpers/input.ts` — `typeIntoTaggedField` (verify + retry, throws naming the field after 3 failed attempts)
- `src/helpers/money.ts` — Rp formatting/parsing incl. the mixed-sign fix
- `npm run test:unit` (node:test via ts-node hook, 17 tests) · `npm run typecheck` (`tsc --noEmit`)
- Locator convention: chain `byTag(...)` results directly, await only when a statement needs the resolved value (documented on `byTag`'s JSDoc)
