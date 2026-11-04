# PR Review — PR #3 `features/phase2` → `main`

- **Reviewed at:** 2026-10-25
- **Reviewer:** ZCode automation agent (GLM-5.3)
- **PR:** https://github.com/almezi/saku-appium/pull/3 — 5 commits, 26 files, +1087 / −150
- **Checks run locally:** `npm run typecheck` clean · `npm run test:unit` 17/17 pass ·
  `src/tests/transaksi/backup.spec.ts` executed 2026-10-25 (4/6 passing, 2 failures
  bug-filed per the AGENTS.md retry protocol)

> **Historical record.** This is the review of PR #3 as it stood on 2026-10-25. It is kept
> verbatim — the findings below are a snapshot, not open work. Status since then
> (re-verified against the tree on 2026-10-27):
>
> | # | Finding | Status |
> |---|---|---|
> | 1 | `.zcode/config.json` committed | ✅ **fixed** — `.zcode/` is now in `.gitignore` (line 186) and is no longer tracked |
> | 2 | `backup.spec.ts` uses a hardcoded UDID instead of the live session | ✅ **fixed** — the spec now reads the device from the live session capability (`caps['appium:udid']`), with the env var only as a fallback (`backup.spec.ts:39,54`) |
> | 3 | `progress.md:155` contradicts the PR's own fix | ✅ **fixed** — the note is now in past tense |
> | 4 | `backup.spec.ts` leaves the import file behind on failure | 🔴 **still open** — the `rm -f` still runs as the last statement of the test body (`backup.spec.ts:208`), so a failing assertion skips it. There is no `after()` hook in the file. |
> | 5 | `wdio.conf.ts` duplicates the spec-path glob | ✅ **fixed** — the runner now assigns specs as a flat `'wdio:specs'` array (`wdio.conf.ts:187`) with the rationale documented in the file header |
> | 6 | `backup.spec.ts` duplicates a tag literal | 🔴 **still open** — `navTag` is still a local literal (`backup.spec.ts:42`), not `tags.navDaftar` |
> | 7 | PR title is the branch name | ✅ **fixed** |
>
> The remaining open engineering debt from this review is tracked in `code_review.md`
> (findings **S1**–**S22** and **M1**–**M14**), and the two backup cases that failed here
> are still tracked as `bugs/BUG_Found_02.md` (SAF picker drive) and `bugs/BUG_Found_03.md`
> (vanishing committed transaction).

## Verdict

**Request changes** — one must-fix, one real correctness bug, one stale doc; the rest
of the PR is solid, well-evidenced work.

## What's good (and verified)

- **`wdio.conf.ts` shard/matrix machinery is correctly designed**: per-device
  `systemPort` collision avoidance, fail-fast validation with actionable messages,
  external-server mapping (`SAKU_APPIUM_PORTS`) with the ports-vs-devices guard, and
  the flat `wdio:specs` array with the documented rationale (nested arrays would
  share one session and break per-spec clean-data isolation).
- **`budget.spec.ts` empty-month fix is right** — the `before` hook now seeds an
  income before opening Anggaran, matching the live-verified UI_SPEC 6.3 behavior
  (the Ringkasan buttons are hidden on an empty month).
- **`anggaran.page.ts` tag corrections match the live build** — nonexistent
  `component_*` draft tags replaced with the verified `anggaran_form_*` family; the
  untagged-picker text fallback is documented as such.
- **`category-management.spec.ts` additions show pitfall awareness** — `scrollToRow`
  before LazyColumn display assertions, `search('')` to clear the persistent filter,
  and deliberate test ordering (rename last so earlier assertions on `inc_salary`
  stay valid).
- **`input.ts` composition wait is a minimal, bounded fix** (worst case 3×15 s, well
  inside the 180 s Mocha cap, retry semantics preserved for interaction-level
  staleness).
- Documentation carries dates and evidence throughout; the bug files follow the
  AGENTS.md template; `progress.md` is honest about 4/6 and the two blockers.

## Findings

### 1. [Must fix] `.zcode/config.json` is committed

Agent-local tooling config; AGENTS.md explicitly forbids committing IDE/tool
artifacts. Remove it from the PR and add `.zcode/` to `.gitignore` (currently not
covered).

### 2. [Bug — P2] `src/tests/transaksi/backup.spec.ts:23` — wrong-device adb in parallel runs

`const UDID = process.env.ANDROID_UDID ?? 'emulator-5554'` is evaluated per worker,
but this same PR adds `SAKU_DEVICES`/shard mode. In any multi-device run, every
worker's adb calls (`run-as` file read, import-file push, cleanup `rm`) would target
the emulator regardless of which device that worker actually drives — silent
cross-device contamination. Derive it from the live session instead, e.g.
`driver.capabilities['appium:udid'] as string` inside the helpers.

### 3. [Stale doc] `progress.md:155` contradicts the PR's own fix

The 2.A note says `budget.spec.ts` TC-BUD-01 "will fail deterministically as written
(its `before` hook seeds nothing)" — but this PR adds exactly that seeding. Reword to
past tense ("fixed in this branch; the hook now seeds an income") so the next agent
doesn't re-triage a resolved issue.

### 4. [Minor] `backup.spec.ts` TC-04 leaves the import file behind on failure

`/sdcard/Download/saku-import-test.json` is only removed after the assertions pass
(the `rm -f` runs last). On failure it lingers, and the next run's Downloads view in
the SAF picker shows two similar file names. Move the cleanup to an `after()`/finally.

### 5. [Minor] `wdio.conf.ts` — spec-path duplication

`collectSpecFiles(path.resolve(__dirname, 'src', 'tests'))` duplicates the global
`specs` glob — two places to update if specs ever move. Worth a shared constant.

### 6. [Nit] `backup.spec.ts:26` — duplicated tag literal

The `navTag` constant duplicates `tags.navDaftar`; import the tags config instead.

### 7. [Meta] PR title is the branch name and the description is empty

For a 26-file, +1087 PR, give it a real title/summary: parallel execution harness,
Phase 2 spec materialization + live MCP verification, 2.C execution with bug files,
documentation consolidation.

## Caveat for the merger

`budget.spec.ts` and `category-management.spec.ts` are merged **without ever having
been executed under WebdriverIO** — their passing evidence is MCP-interactive only,
and `progress.md` honestly labels them "written, not yet executed". Running
`npm run test:anggaran` and `npm run test:kategori` before or immediately after
merge would close that gap (and the budget spec's newly added seed path is itself
unexercised).
