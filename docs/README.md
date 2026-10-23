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
| 1 | [01-architecture-blueprint.md](01-architecture-blueprint.md) | MVVM layers, system diagram, data flow, state management, threading, DI |
| 2 | [02-tech-stack-dependencies.md](02-tech-stack-dependencies.md) | Language/toolchain versions, min–target SDK, every dependency with version and purpose |
| 3 | [03-codebase-setup.md](03-codebase-setup.md) | Repo, branches, IDE setup, environment config, build/test/run commands |

## Security & Operations

No backend, no credentials, no CI — local-only app, manual `./gradlew` builds. Backup is CSV/JSON via the Cadangan screen.

## Product & Business

| # | Document | Covers |
|---|---|---|
| - | [PRD.md](PRD.md) | Product Requirement Document: Executive summary, goals, user stories, detailed features, technical constraints |
| 6 | [06-functional-spec.md](06-functional-spec.md) | User stories, business rules, edge cases, RBAC; CSV/JSON backup formats (the app's only "interface") |
| 8 | [08-design-system.md](08-design-system.md) | Tokens, typography, spacing, components, motion, test tags |
| 9 | [09-ios-migration-plan.md](09-ios-migration-plan.md) | **Plan (not implemented).** 48-step to-do list to release on iOS via KMP + Compose Multiplatform |

## Source-of-truth files already in the repo

These predate this documentation set and remain authoritative for product and
test scope. Do not duplicate their content in new places without a reason.

| File | Authority over |
|---|---|
| `AGENTS.md` | Rules for AI coding tools working in this repo |
| `UI_SPEC.md` | What the app does; screen-by-screen behaviour |
| `CATEGORIES.md` | Category IDs, columns, `countsInTotals` rules |
| `TESTABILITY.md` | Test-tag contract, debug hooks, seed sets |
| `improve/` | Design package: design system and screens |
| `README.md` | Build commands, key files, APK download |

## Reading order for a new engineer

1. `README.md` — build it and run it.
2. [03-codebase-setup.md](03-codebase-setup.md) — local environment.
3. [01-architecture-blueprint.md](01-architecture-blueprint.md) — how it fits together.
4. `UI_SPEC.md` — what the app is supposed to do.
5. [06-functional-spec.md](06-functional-spec.md) — the rules behind that spec.
6. [08-design-system.md](08-design-system.md) — before writing any UI.

## Status

Last verified against the working tree on the `feature/improve-design-2.0`
branch (HEAD `8c7dc3a`). No CI configuration, signing configuration, or backend
exists in the repository as of this writing; see documents 4, 5 and 7. The app
is Android-only; document 9 is a plan for adding iOS.