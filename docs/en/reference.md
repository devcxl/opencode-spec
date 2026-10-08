# Reference

[Back to README](../../README.en.md) | [中文](../zh/reference.md)

This document summarizes commands, skills, and workflow provided by `opencode-spec`.

## Commands

- `/opsx-propose`
- `/opsx-explore`
- `/opsx-apply`
- `/opsx-archive`
- `/opsx-new-change` (alias `/opsx-new`)
- `/opsx-continue-change` (alias `/opsx-continue`)
- `/opsx-ff-change` (alias `/opsx-ff`)
- `/opsx-update-change` (alias `/opsx-update`)
- `/opsx-sync-specs` (alias `/opsx-sync`)
- `/opsx-verify-change` (alias `/opsx-verify`)
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
- **skills**: Read directly from the plugin package, with script paths rendered in memory before `ctx.skill.transform`; no temporary copy is created

Prerequisite: **the shell used by OpenCode must be able to run `node` directly**.

SKILL.md files reference scripts using `.opencode/skills/` as a path placeholder. Registration replaces it with a quoted package path in memory; each invocation receives its workspace-specific `OPENSPEC_DIR`, so no scripts need to be installed in the project directory.
