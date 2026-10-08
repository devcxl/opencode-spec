## Why

Workflow behavior is implemented in the shared `assets/skills/_shared/references/openspec.js` module, but agents invoke it through seven operation-specific JavaScript wrappers distributed across skill directories. Repeating these paths throughout skills and commands makes the runtime interface harder to discover and update. A single bundled Node CLI provides one stable invocation point while retaining the existing shared implementation and the package's no-upstream-CLI deployment model.

## What Changes

- Add one package-bundled Node CLI entry point with subcommands for listing changes, creating a change, reading status and artifact instructions, preparing apply, marking tasks, and archiving.
- Route all skill and command instructions through that entry point and remove the operation-specific wrapper scripts.
- Update user-facing architecture, usage, and reference documentation to describe the unified CLI.
- Keep workflow/domain behavior in the shared module; centralize CLI argument dispatch, JSON output, and error/exit handling at the entry point.
- Preserve per-invocation `OPENSPEC_DIR`, existing JSON result shapes, and all current operation semantics.

## Capabilities

### New Capabilities

- `reference-script-cli`: provides a single Node-executable CLI for the bundled OpenSpec workflow operations.

### Modified Capabilities

None.

## Impact

- Affects the bundled reference scripts, skill and command instructions that invoke them, the onboard preflight check, bilingual architecture/usage/reference documentation, and reference-script tests.
- Requires Node in the environment that executes workflow scripts, as the current script calls already do.
- Removes the old operation-specific script paths. They are currently used by bundled instructions and tests, not documented as a stable external API; direct external callers would need to migrate to the unified CLI.
- Adds no dependency, separate package, global executable installation, or project-local resource copy.
