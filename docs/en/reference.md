# Reference

[Back to README](../../README.en.md) | [中文](../zh/reference.md)

This document summarizes commands, skills, and workflow provided by `opencode-spec`.

## Commands

- `/opsx-propose`
- `/opsx-explore`
- `/opsx-apply`
- `/opsx-archive`
- `/opsx-new-change`
- `/opsx-continue-change`
- `/opsx-ff-change`
- `/opsx-update-change`
- `/opsx-sync-specs`
- `/opsx-verify-change`
- `/opsx-bulk-archive`
- `/opsx-onboard`

## Skills

| Skill | Description | Built-in Scripts |
|-------|-------------|-------------------|
| `openspec-propose` | Create change and generate artifacts | new-change.js, status.js, instructions.js |
| `openspec-explore` | Explore problems, clarify requirements | list.js |
| `openspec-apply` | Implement and mark tasks complete | prepare-apply.js, mark-tasks.js |
| `openspec-archive` | Archive completed change | archive.js |
| `openspec-new-change` | Start a change incrementally | Reuses propose scripts |
| `openspec-continue-change` | Create the next artifact | Reuses propose scripts |
| `openspec-ff-change` | Create planning artifacts in order | Reuses propose scripts |
| `openspec-update-change` | Revise existing planning artifacts | Reuses status/instructions scripts |
| `openspec-sync-specs` | Merge change specs into main specs | Agent-driven; reuses status script |
| `openspec-verify-change` | Review implementation against artifacts | Reuses apply scripts |
| `openspec-bulk-archive-change` | Archive multiple changes | Reuses archive script |
| `openspec-onboard` | Guided workflow | Reuses core scripts |

## Workflow

```
propose → apply → archive
explore (optional, use anytime)
```

## Injection Mechanism

The OpenCode V2 plugin registers commands and skills at runtime without writing integration files to the project's `.opencode/` directory:

- **commands**: Parsed from `assets/commands/*.md` and registered via `ctx.command.transform`
- **skills**: Copied to a system temp directory, paths replaced, then registered via `ctx.skill.transform`; removed on unload

Prerequisite: **the shell used by OpenCode must be able to run `node` directly**.

SKILL.md files reference scripts using `.opencode/skills/` as a path placeholder. These calls are replaced at runtime with quoted temporary paths and per-workspace `OPENSPEC_DIR`, so no corresponding files need to exist in the project directory.
