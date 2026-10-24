# Saku (SimpleMoneyTracker-KT) — Documentation Index

Project documentation for **Saku**, the app in this repository (package
`id.almezi.simplemoneytracker_kt`).

Saku is a small, **local-only, offline** personal money tracker. Indonesian UI,
single wallet, IDR only, no network, no login, no analytics. It exists
primarily as a **test target for mobile automation**, so it is deliberately
small. Several sections of the requested documentation set therefore have
little or nothing to describe — that is a property of the product, not a gap
in the docs. Those sections say so explicitly instead of inventing content.

## Technical & Architecture

| # | Document | Covers |
|---|---|---|
| 1 | [DEVELOPMENT.md](DEVELOPMENT.md) | Architecture, tech stack, codebase setup |

## Security & Operations

No backend, no credentials, no CI — local-only app, manual `./gradlew` builds. Backup is CSV/JSON via the Cadangan screen.

## Product & Business

| # | Document | Covers |
|---|---|---|
| - | [PRODUCT.md](PRODUCT.md) | PRD and functional spec |
| 8 | [DESIGN.md](DESIGN.md) | Design system and accessibility ID coverage |
| 9 | [09-ios-migration-plan.md](09-ios-migration-plan.md) | **Plan (not implemented).** 48-step to-do list to release on iOS via KMP + Compose Multiplatform |

## Source-of-truth files already in the repo

These predate this documentation set and remain authoritative for product and
test scope. Do not duplicate their content in new places without a reason.

| File | Authority over |
|---|---|
| `AGENTS.md` | Rules for AI coding tools working in this repo |
| `UI_SPEC.md` | What the app does; screen-by-screen behaviour |
| `TESTABILITY.md` | Test-tag contract, debug hooks, seed sets |
| `improve/` | Design package: design system and screens |
| `README.md` | Build commands, key files, APK download |

## Reading order for a new engineer

1. `README.md` — build it and run it.
2. [DEVELOPMENT.md](DEVELOPMENT.md) — local environment.
3. [DEVELOPMENT.md](DEVELOPMENT.md) — how it fits together.
4. `UI_SPEC.md` — what the app is supposed to do.
5. [PRODUCT.md](PRODUCT.md) — the rules behind that spec.
6. [DESIGN.md](DESIGN.md) — before writing any UI.

## Status

Last verified against the working tree on the `feature/improve-design-2.0`
branch (HEAD `8c7dc3a`). No CI configuration, signing configuration, or backend
exists in the repository as of this writing; see documents 4, 5 and 7. The app
is Android-only; document 9 is a plan for adding iOS.