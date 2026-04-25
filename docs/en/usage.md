# Usage Guide

[Back to README](../../README.en.md) | [中文](../zh/usage.md)

This document describes the recommended way to use `opencode-spec`.

## 1. Install the Plugin

Configure `opencode.json` in the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

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

| Type | Entry | Description |
|------|-------|-------------|
| Command | `/opsx-propose` | Recommended starting point |
| Command | `/opsx-explore` | Requirement exploration |
| Command | `/opsx-apply` | Task implementation |
| Command | `/opsx-archive` | Archive completed |
| Skill | `openspec-propose` | Agent invokes directly |
| Skill | `openspec-explore` | Agent invokes directly |
| Skill | `openspec-apply` | Agent invokes directly |
| Skill | `openspec-archive` | Agent invokes directly |

## 4. Built-in Reference Scripts

Each skill includes JavaScript scripts in `.opencode/skills/<skill-name>/references/`:

- `openspec-propose`: new-change.js, status.js, instructions.js
- `openspec-explore`: list.js
- `openspec-apply`: prepare-apply.js, mark-tasks.js
- `openspec-archive`: archive.js

These scripts replace external openspec CLI and directly manipulate `openspec/` directory structure.

## 5. Handle Sync Conflicts

If the plugin detects file edits, it creates `.new` file instead of overwriting.

Recommended handling:

1. compare original file with `.new` file
2. merge content you want to keep
3. remove `.new` file
4. restart OpenCode if updated
