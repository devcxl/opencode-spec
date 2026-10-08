# Usage Guide

[Back to README](../../README.en.md) | [中文](../zh/usage.md)

This document describes the recommended way to use `opencode-spec`.

## 1. Install the Plugin

OpenCode V2 is required. Configure `opencode.json` in the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@devcxl/opencode-spec"]
}
```

Prerequisite: **the shell used by OpenCode must be able to run `node` directly**.

Reason: skills invoke JavaScript reference scripts that run via `node`.

## 2. Workflow

```
propose → apply → archive
explore (optional, use anytime)
```

### propose

Create change and generate proposal / specs / design / tasks.

### explore

Explore problems, clarify requirements. No implementation.

### apply

Implement tasks and mark them complete.

### archive

Archive completed change.

## 3. Entry Points

### Core Commands

| Type | Entry | Description |
|------|-------|-------------|
| Command | `/opsx-propose` | Recommended starting point: create change and all planning artifacts |
| Command | `/opsx-explore` | Requirement exploration |
| Command | `/opsx-apply` | Task implementation |
| Command | `/opsx-archive` | Archive completed |
| Skill | `openspec-propose` | Agent invokes directly |
| Skill | `openspec-explore` | Agent invokes directly |
| Skill | `openspec-apply` | Agent invokes directly |
| Skill | `openspec-archive` | Agent invokes directly |

### Extension Commands

| Type | Entry | Description |
|------|-------|-------------|
| Command | `/opsx-new-change` | Start a new change, step by step |
| Command | `/opsx-continue-change` | Continue to the next artifact |
| Command | `/opsx-ff-change` | Generate all planning artifacts quickly |
| Command | `/opsx-update-change` | Revise planning artifacts coherently |
| Command | `/opsx-sync-specs` | Sync delta specs to main specs |
| Command | `/opsx-verify-change` | Verify implementation matches artifacts |
| Command | `/opsx-bulk-archive` | Archive multiple changes at once |
| Command | `/opsx-onboard` | Guided full workflow tutorial |
| Skill | `openspec-new-change` | Agent invokes directly |
| Skill | `openspec-continue-change` | Agent invokes directly |
| Skill | `openspec-ff-change` | Agent invokes directly |
| Skill | `openspec-update-change` | Agent invokes directly |
| Skill | `openspec-sync-specs` | Agent invokes directly |
| Skill | `openspec-verify-change` | Agent invokes directly |
| Skill | `openspec-bulk-archive-change` | Agent invokes directly |
| Skill | `openspec-onboard` | Agent invokes directly |

## 4. Built-in Reference CLI

All skills execute the shared Node CLI at `assets/skills/_shared/references/openspec-cli.js`:

- `list`
- `new-change <name>`, `status <name>`, `instructions <artifact-id> --change=<name>`
- `prepare-apply --change=<name>`, `mark-tasks --change=<name> ...`
- `archive --change=<name> ...` (including the `--instructions` mode)

The CLI dispatches to the shared workflow implementation in `openspec.js`; it replaces the external OpenSpec CLI without adding that dependency. Extension skills reuse these same subcommands.
