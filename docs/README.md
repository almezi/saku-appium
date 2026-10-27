# Saku (SimpleMoneyTracker-KT) — Documentation Index

Project documentation for **Saku**, the app this repository tests
(package `id.almezi.simplemoneytracker_kt`).

Saku is a small, **local-only, offline** personal money tracker. Indonesian UI,
single wallet, IDR only, no network, no login, no analytics. It exists
primarily as a **test target for mobile automation**, so it is deliberately
small. Several sections of the requested documentation set therefore have
little or nothing to describe — that is a property of the product, not a gap
in the docs. Those sections say so explicitly instead of inventing content.

> **Where these docs live.** This repository is the **test harness** — the Appium +
> WebdriverIO + TypeScript suite in `src/`. The app's own Kotlin/Compose source lives
> in a separate repository (`SimpleMoneyTracker-KT`). The documents in this folder
> describe **the app**; the documents in the repo root describe **the harness**.

## Technical & Architecture

| # | Document | Covers |
|---|---|---|
| 1 | [DEVELOPMENT.md](DEVELOPMENT.md) | Architecture, tech stack, codebase setup, Android → iOS migration notes |

## Security & Operations

No backend, no credentials, no CI — local-only app, manual `./gradlew` builds. Backup is CSV/JSON via the Cadangan screen.

## Product & Business

| # | Document | Covers |
|---|---|---|
| - | [PRODUCT.md](PRODUCT.md) | PRD and functional spec |
| 8 | [DESIGN.md](DESIGN.md) | Design system and accessibility ID coverage |
| 9 | [09-ios-migration-plan.md](09-ios-migration-plan.md) | **Plan (not implemented in the harness.)** 48-step to-do list to release on iOS via KMP + Compose Multiplatform |

## Source-of-truth files in the repo root

These predate this documentation set and remain authoritative for product and
test scope. Do not duplicate their content in new places without a reason.

| File | Authority over |
|---|---|
| `AGENTS.md` | Rules for AI coding tools working in this repo |
| `UI_SPEC.md` | What the app does; screen-by-screen behaviour |
| `TESTABILITY.md` | Test-tag contract, debug hooks, seed sets, § CATEGORIES |
| `improve/` | Design package: design system and screens |
| `README.md` | Harness layout, run commands, iOS runbook |
| `HANDOVER.md` | Onboarding guide for a new SDET/QA engineer |
| `test-cases-simple-money-tracker.md` | Catalogue of 195 designed test cases |
| `progress.md` | Execution checklist — which cases have actually run |
| `code_review.md` | Senior QA review of the harness (structure, conventions, maintainability) |
| `BUGS.md` | Index of the 14 filed defects |

## Reading order for a new engineer

**Working on the app (this repo's `docs/`):**

1. `UI_SPEC.md` — what the app is supposed to do.
2. [PRODUCT.md](PRODUCT.md) — the rules behind that spec.
3. [DESIGN.md](DESIGN.md) — before writing any UI.
4. [DEVELOPMENT.md](DEVELOPMENT.md) — local environment and how it fits together.

**Working on the harness (the repo root):**

1. `README.md` — layout, run commands, iOS runbook.
2. `HANDOVER.md` — a day-one onboarding path.
3. `AGENTS.md` — the rules any agent must follow here.
4. `TESTABILITY.md` — **read this before writing a single locator.**
5. `code_review.md` — the known weak points before you refactor anything.

## Status

Last verified against the working tree on the `feature/implement-ios-automation`
branch (HEAD `c73d097`). No CI configuration, signing configuration, or backend
exists in the repository as of this writing; see documents 4, 5 and 7.

The app itself is Android-only today — document 9 is a **plan** for adding iOS.
The *test harness* has already been ported to iOS: 14 iOS spec files and 8 iOS
page objects exist alongside their Android twins, driven by `wdio.ios.conf.ts`.
See `README.md` § Run — iOS and `IOS_PHASE1_HANDOFF.md` for the port's history.
