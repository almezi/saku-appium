# AGENTS.md — Agent Operating Instructions

This file tells coding agents how to operate within the Saku test harness workspace.

## Commands to Run

- **Build (Android)**: `./gradlew assembleDebug`
- **Run tests locally**: See `test-execution-plan.md` for the OpenCode workflow.
- **Start Appium session**: `opencode mcp run --session <session> -- npx -y appium-mcp@latest`

## Git Commit Conventions

- Commits follow Conventional Commits: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`
- Never commit IDE lock files, build artifacts, or temporary screenshots.

## Error Logging

- Log errors to the terminal and append to `test-cases-simple-money-tracker.md` when a test fails.
- Use `--verbose` flag when running Appium MCP tools.

## Bug Reporting Protocol

When any agent (human or AI) discovers a bug during test execution, it must:

1. **Stop** the current sub-phase execution (do not continue testing the same flow).
2. **Create** a bug report file named `BUG_FOUND.md` in the repo root (copy `BUG_FOUND.template.md`).
3. **Reference** the bug in `progress.md` by marking the affected test case with `~[BUG]` instead of `[x]`.
4. **Notify** all other agents via team broadcast or mailbox so they can avoid the same area.

### BUG_FOUND.md — Required Fields

Copy the template from `BUG_FOUND.template.md` and fill every field:

| Section | Required Fields |
|---------|----------------|
| **Identity** | Reported by, Reported at (ISO timestamp), Branch, Commit SHA |
| **Test Context** | Phase (1\|2\|3), Sub-phase (e.g. 1.B), Test case ID (e.g. TC-INC-01), Spec file |
| **Bug Details** | Title, Description, Steps to Reproduce, Actual Result, Expected Result, Attachment, Severity, Priority |
| **Environment** | Device/Emulator, Platform, Appium version, App build, Android API level |
| **Additional Notes** | Extra context, workarounds, related test cases affected |

### Severity Definitions

| Severity | Meaning |
|----------|---------|
| **Blocker** | App crashes, cannot launch, or core functionality completely broken; testing must stop |
| **Critical** | Major user flow broken (save, delete, edit, list); workaround impossible |
| **Major** | Feature works but with incorrect data/calculation; workaround exists |
| **Minor** | UI glitch, cosmetic issue, or non-critical formatting problem |
| **Trivial** | Typo, minor alignment, or cosmetic only |

### Priority Definitions

| Priority | Meaning |
|----------|---------|
| **P0** | Fix before any further testing; blocks entire phase |
| **P1** | Fix before Phase completion; blocks specific sub-phase |
| **P2** | Fix in next sprint; does not block current testing |
| **P3** | Nice-to-have; log for future reference |

### Rules for All Agents

- **Never skip a bug** — if a test fails unexpectedly, investigate and report it.
- **One bug per `BUG_FOUND.md`** — if multiple bugs are found, create multiple files (e.g., `BUG_Found_02.md`).
- **Do not delete** `BUG_FOUND.md` files — they are the record of known issues.
- **Reference the bug ID** when discussing test failures in team messages.
- **Check existing `BUG_FOUND.md` files** before starting a sub-phase to avoid duplicating known issues.
- **Test failure retry limit** — if a test case fails more than twice (3 consecutive failed attempts), skip that test case, mark it with `~[BUG]~` in `progress.md`, create a `BUG_FOUND.md` entry, and continue with the remaining backbone tests. All skipped / repeatedly failing test cases are investigated only after all backbone tests in the current phase are completed.

## Directory Layout

```
├── docs/          # Technical documentation (specs, architecture)
├── improve/       # Design system and screen specs
├── TESTABILITY.md   # Test tag contracts (read this first)
├── UI_SPEC.md       # UI behavior spec (read this too)
├── CATEGORIES.md    # Category definitions (read this too)
├── AGENTS.md        # Agent operating instructions (this file)
├── agent.md         # Agent bug reporting protocol
├── BUG_FOUND.template.md   # Bug report template
├── BUG_FOUND.md            # Created when a bug is found (do not delete)
├── progress.md             # Test execution checklist (mark [x]/~[BUG]~)
┕ root /            # Test infrastructure files
│   ├── README.md
│   ├── test-cases-simple-money-tracker.md
│   └── test-execution-plan.md
```
