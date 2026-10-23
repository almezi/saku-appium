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

## Directory Layout

```
├── docs/          # Technical documentation (specs, architecture)
├── improve/       # Design system and screen specs
├── TESTABILITY.md   # Test tag contracts (read this first)
├── UI_SPEC.md       # UI behavior spec (read this too)
├── CATEGORIES.md    # Category definitions (read this too)
┕ root /            # Test infrastructure files
│   ├── README.md
│   ├── test-cases-simple-money-tracker.md
│   └── test-execution-plan.md
```
