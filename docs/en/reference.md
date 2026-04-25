# Reference

[Back to README](../../README.en.md) | [中文](../zh/reference.md)

This document summarizes commands, skills, and workflow provided by `opencode-spec`.

## Commands

- `/opsx-propose`
- `/opsx-explore`
- `/opsx-apply`
- `/opsx-archive`

## Skills

| Skill | Description | Built-in Scripts |
|-------|-------------|-------------------|
| `openspec-propose` | Create change and generate artifacts | new-change.js, status.js, instructions.js |
| `openspec-explore` | Explore problems, clarify requirements | list.js |
| `openspec-apply` | Implement and mark tasks complete | prepare-apply.js, mark-tasks.js |
| `openspec-archive` | Archive completed change | archive.js |

## Workflow

```
propose → apply → archive
explore (optional, use anytime)
```

## Asset Sync

On startup, the plugin syncs:

- `assets/commands/*` → `.opencode/commands/*`
- `assets/skills/*` → `.opencode/skills/*`
- `assets/templates/*` → `.opencode/opencode-spec/templates/*`

If skills are written for the first time or upgraded, restarting OpenCode is recommended.