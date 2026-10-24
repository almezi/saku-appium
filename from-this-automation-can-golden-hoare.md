---
name: from-this-automation-can-golden-hoare
description: Plan evaluating WebdriverIO (TypeScript) vs Kotlin for the Saku test automation
---

# Plan: Test Automation Framework Choice for Saku

## Context

This plan evaluates whether the Saku test automation can be implemented using **WebdriverIO (TypeScript)** or **Kotlin**, given the existing codebase.

**Important structural fact about this workspace:** `saku-appium` is the test/documentation harness — it holds `test-cases-simple-money-tracker.md` (~140 cases), `Phases.md`, `TESTABILITY.md`, `UI_SPEC.md`, `opencode.json` (Appium MCP config), and a stub `package.json`. It does **not** contain app source code, Gradle files, or `TestTags.kt`. The actual app (`id.almezi.simplemoneytracker_kt`, Kotlin + Jetpack Compose, package `id.almezi.simplemoneytracker_kt`, offline, no Android permissions, minSdk 24/targetSdk 37, AGP 9.4.1, Gradle 9.7.1, Kotlin 2.4.20) lives in a separate repo (`SimpleMoneyTracker-KT`). Its `TestTags.kt` defines the locator contract: all elements locate **only by test tag** (`<screen>_<type>_<name>` lower-snake-case, e.g. `tambah_button_save`, `daftar_item_<id>`), which map to Compose semantics on Android and `accessibilityIdentifier` on iOS. Tags must be unique per item (id-suffixed). Never locate by visible text.

Current automation in this harness repo: **Appium MCP** (UiAutomator2, Android Pixel 10, API 34+) driven through an OpenCode harness via `appium_generate_tests` — markdown test specs + `Phases.md` 3-phase ordering (Core Flows → Advanced Features → Edge Cases), executed as natural-language step lists with screenshot/page-source verification. No CI, no committed test code, no WebdriverIO config, no Kotlin test sources, `package.json` is a stub (`test` echo only).

The user asks whether a structured test plan can be built using **WebdriverIO (TypeScript)** or **Kotlin**.

## Question Answered

**Yes** — a structured test plan can be built with either technology. Both drive the app through **Appium** (UiAutomator2 on Android) and consume the same `TestTags.kt` accessibility-id tag contract. The decisive question is **where the test code lives**, which determines the natural choice:

| Dimension | WebdriverIO (TypeScript) | Kotlin (instrumented / Appium Java client) |
|---|---|---|
| **Where it lives** | **This harness repo** (`saku-appium`). External Appium driver; no app source needed here. | **The separate app repo** (`SimpleMoneyTracker-KT`). Needs the Gradle project, `TestTags.kt`, and Android source sets. |
| **Language/toolchain** | Node.js + TypeScript + WDIO (`@wdio/cli`, `@wdio/appium-service`, `ts-node`). New toolchain here. | Kotlin + Gradle (already the app's pipeline: JDK 17, AGP 9.4.1, Gradle 9.7.1). Either `appium-java-client` + JUnit5, or Espresso 3.5.1 (already a declared test dep). |
| **Locator mapping** | WDIO `accessibilityId("tambah_button_save")` → tag → Compose semantics (Android) / `accessibilityIdentifier` (iOS). Native Appium locators, no bridge. | `By.accessibilityId(...)` (Appium Java client) or `onNode(withTestTag(...))` / `onView(withAccessibilityId(...))` (Espresso, with `testTagsAsResourceId=true` in MainActivity — flag exists but not yet implemented in code). |
| **Cross-platform** | Single WDIO spec can target Android + future iOS via the same tag contract (accessibilityId ↔ accessibilityIdentifier). | Kotlin tests in the app repo can run on Android now; iOS KMP is future-only (Stage 0 spike confirmed tags work on iOS). |
| **Effort** | Moderate: flesh out `package.json`, `wdio.conf.js`, TS page objects keyed by tags, map ~140 markdown cases to WDIO specs. | Moderate: new `androidTest` source set + Gradle deps, write Kotlin test classes. Requires cross-repo coordination (tag contract lives in app repo). |
| **Reuse of existing artifacts** | Keeps `TESTABILITY.md`, `Phases.md`, markdown test cases as the spec; TS code is the runner. Risk of drift between markdown and TS specs if both are maintained. | Same tag contract; markdown cases stay as documentation/spec. Zero locator drift if Kotlin tests mirror tag names. |

## Recommendation: Choose by where tests should live

**WebdriverIO (TypeScript) — recommended if tests stay in this harness repo.**
This repo is the test harness; it already owns `opencode.json`, `TESTABILITY.md`, `Phases.md`, and the markdown test cases. A WebdriverIO suite here drives the app externally over Appium/WebDriver, needs no app source, and naturally extends the existing Appium-based workflow. The tag contract (accessibility ID) maps directly to WDIO `accessibilityId` selectors. Best for a unified automation layer that can later target Android + iOS from one spec set. Downside: introduces a Node/TS toolchain this repo doesn't currently have.

**Kotlin — recommended if tests live in the app repo (`SimpleMoneyTracker-KT`).**
That repo owns `TestTags.kt`, Gradle, and the Android build pipeline. Kotlin instrumented tests (Espresso or Appium Java client + JUnit5) run via `./gradlew connectedAndroidTest` on the same Pixel 10 emulator, with the same JDK 17 toolchain already in place. Best if the team wants instrumentation tests co-located with production code. Downside: no test source set exists yet; must be created from scratch; tag contract must be imported/shared from the app repo.

**Not recommended: a blanket preference for one.** Neither WebdriverIO nor Kotlin is part of the repo's current automation conventions (the established stack is Appium MCP + OpenCode markdown specs). Both are new tooling layers. Pick based on test-code location, not language affinity alone.

## Critical Files to Create/Modify

### Option A — WebdriverIO (TypeScript), in this repo (`saku-appium`)

| Path | Action | Why |
|---|---|---|
| `package.json` | Flesh out: add `webdriverio`, `@wdio/cli`, `@wdio/appium-service`, `@wdio/local-runner`, `@wdio/spec-reporter`, `typescript`, `ts-node`, `@types/node` | WDIO test runner + Appium service + TS support |
| `wdio.conf.ts` (new) | WDIO config: Appium service, `platformName: Android`, `automationName: UiAutomator2`, `deviceName: Pixel 10`, `appium:app` = debug APK path, `accessibilityId` locator strategy | Connects WDIO to the existing Appium server / emulator setup |
| `src/pageobjects/*.ts` (new) | Page objects keyed by `TestTags.kt` tags: `TambahPage`, `DaftarPage`, `RingkasanPage`, `KelolaKategoriPage`, `AnggaranPage` | Reusable locators: `tambah_button_save`, `daftar_item_<id>`, `component_nav_bottom_<tab>`, etc. |
| `src/tests/*.ts` (new) | Test specs following `Phases.md` ordering: Phase 1 core flows (Tambah income/expense, Transaksi list, Ringkasan summary, Edit/Delete) | Structured, type-safe replacement/runner for the markdown specs |
| `test-cases-simple-money-tracker.md` | **No changes** — keep as canonical spec/locator map | Single source of truth; TS tests reference same tag names |
| `TESTABILITY.md`, `Phases.md` | **No changes** | Tag contract and phase ordering stay immutable |
| `.github/workflows/...` (optional) | CI: Node setup, `npm test` → WDIO, publish results | Optional CI integration |

### Option B — Kotlin (instrumented), in the separate app repo (`SimpleMoneyTracker-KT`)

| Path | Action | Why |
|---|---|---|
| `app/build.gradle.kts` | Add `androidTestImplementation("io.appium:appium-java-client:10.0.0")` + `androidTestImplementation("org.junit.jupiter:junit-jupiter:5.10.2")` (or rely on existing Espresso 3.5.1) | Appium Java client or Espresso for instrumentation tests |
| `gradle/libs.versions.toml` | Add `appiumJavaClient = "10.0.0"` and `junitVersion = "5.10.2"` (optional) | Centralized version management |
| `app/src/androidTest/java/id/almezi/simplemoneytracker_kt/SmokeTest.kt` (new) | First Kotlin test: `By.accessibilityId("tambah_button_save")` (Appium client) or `onNode(withTestTag("tambah_button_save"))` (Espresso), run Phase 1 core flow | Entry point proving tag→locator resolution works |
| `app/src/androidTest/java/id/almezi/simplemoneytracker_kt/Phase1Test.kt` (new) | Kotlin test class following `Phases.md` Phase 1 ordering, soft asserts + screenshot on failure | Mirrors phase structure for phased migration |

## Verification (Smoke Test)

A minimal end-to-end verification for either approach:

1. **Build the debug APK** (`./gradlew assembleDebug` in the app repo) → `app/build/outputs/apk/debug/app-debug.apk`.
2. **Start Appium** (UiAutomator2, Android Pixel 10, API 34+, `ANDROID_HOME` set — matches `opencode.json` and `docs/03-codebase-setup.md`).
3. **Run one representative test**: add an income transaction via `tambah_*` tags → assert it appears in `daftar_item_*` list on `daftar_screen` → verify `ringkasan_balance_value` updates on `ringkasan_screen`.
4. **Assertions**: soft assertions per `test-results-template.md` style; screenshot on failure (`mcp__appium__appium_screenshot`). Report: status ✅ PASS / ❌ FAIL, duration, screenshots, page-source snippet.
5. **Pass condition**: no `NoSuchElementException` / element-not-found for any tag lookup; transaction visible in the list; summary updated. If a tag fails to resolve, report the missing tag and exit FAIL — confirming whether the locator contract holds for the chosen framework.

## Open Questions (for the user to decide)

1. **Where should the test code live?** In this harness repo (→ WebdriverIO/TypeScript recommended) or in the separate app repo `SimpleMoneyTracker-KT` (→ Kotlin recommended)? This is the single biggest decision; everything else follows from it.
2. **Migration vs parallel pilot:** Gradually replace markdown MCP tests with the new framework, or run both in parallel with markdown as the primary spec? Recommendation: incremental migration starting with Phase 1 core flows.
3. **CI integration:** Add a GitHub Actions workflow (`npm test` for WDIO, or `connectedAndroidTest` for Kotlin) on every PR, or keep local-only?
4. **Test reporting format:** JUnit XML (standard for both frameworks) or keep the existing markdown `test-results-template.md` style?

## Next Phases (post-MVP)

These are intentionally deferred from the MVP to keep the first implementation minimal.

### Cucumber BDD

Both frameworks support Gherkin-style BDD:

- **WebdriverIO:** `@wdio/cucumber-framework` + `@wdio/cucumber-preprocessors` — `.feature` files with TypeScript step definitions backed by the same tag-keyed page objects. Your existing markdown test cases would need to be rewritten (or generated) into `.feature` files; `TESTABILITY.md` still governs locators inside step definitions (test tags only, never visible text).
- **Kotlin:** `cucumber-jvm` / `cucumber-kotlin` with JUnit 5 under `connectedAndroidTest`; step definitions call the Appium Java client or Espresso using `TestTags.kt` constants.

**MVP decision:** skip Cucumber for now. Start with plain WDIO mocha/jasmine specs (or Kotlin JUnit `@Test` methods) so the locator contract and runner are proven first. Add Cucumber once Phase 1 is stable and the team wants business-readable specs.

### Self-heal

Neither WebdriverIO nor Kotlin/Appium has self-heal out of the box. It would be a custom wrapper around element lookup:

- Try the primary `accessibilityId` tag first, then fall back to alternate tag strategies before failing.
- Log which fallback succeeded so `TestTags.kt` / fixtures can be corrected.
- Auto-retry on stale/no-such-element errors.

**MVP decision:** skip self-heal for now. Build plain tag-based page objects with explicit waits and retry first. Self-heal is a v2 consideration once the locator contract is stable and you've measured which tags are actually flaky. If added later, keep it **tag-only** — falling back to visible-text locators would violate the `TESTABILITY.md` rule ("locate only by test tag, never by visible text") and could mask real UI regressions.

## Effort Summary

| Activity | Rough effort |
|---|---|
| WebdriverIO: scaffold `package.json` + `wdio.conf.ts` + page objects | ~1–1.5 days |
| WebdriverIO: port Phase 1 core flows to TS specs | ~2 days |
| WebdriverIO: smoke-test on emulator + Appium | ~0.5 day |
| Kotlin (app repo): Gradle deps + `SmokeTest.kt` + `Phase1Test.kt` | ~3–4 days |
| Kotlin: smoke-test on emulator + Appium | ~0.5 day |
| Optional CI workflow | ~0.5–1 day |

## Bottom line

- **Both WebdriverIO (TS) and Kotlin are feasible.** Both drive through Appium and consume the same `TestTags.kt` accessibility-id tag contract.
- **WebdriverIO/TypeScript** is the natural fit if tests stay in this harness repo (`saku-appium`) — it extends the existing Appium-based workflow without needing app source here.
- **Kotlin** is the natural fit if tests live in the separate app repo (`SimpleMoneyTracker-KT`) — it reuses the existing Gradle/JDK toolchain and co-locates tests with production code.
- Neither is currently part of the repo's automation conventions; both require building a new tooling layer. Decide based on test-code location, not language preference alone.

The next step, once you confirm where tests should live, is to scaffold either the WDIO TypeScript config (here) or the Kotlin androidTest source set (in the app repo), keeping `TESTABILITY.md`, `Phases.md`, and the markdown test cases as the immutable spec/locator source of truth.