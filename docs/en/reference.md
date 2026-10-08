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

| Skill | Description | Unified CLI operations |
|-------|-------------|-------------------|
| `openspec-propose` | Create change and generate artifacts | `new-change`, `status`, `instructions` |
| `openspec-explore` | Explore problems, clarify requirements | `list` |
| `openspec-apply` | Implement and mark tasks complete | `prepare-apply`, `mark-tasks` |
| `openspec-archive` | Archive completed change | `archive` |
| `openspec-new-change` | Start a change incrementally | Reuses propose operations |
| `openspec-continue-change` | Create the next artifact | Reuses propose operations |
| `openspec-ff-change` | Create planning artifacts in order | Reuses propose operations |
| `openspec-update-change` | Revise existing planning artifacts | Reuses `status` and `instructions` |
| `openspec-sync-specs` | Merge change specs into main specs | Agent-driven; reuses `status` |
| `openspec-verify-change` | Review implementation against artifacts | Reuses apply operations |
| `openspec-bulk-archive-change` | Archive multiple changes | Reuses `list` and `archive` |
| `openspec-onboard` | Guided workflow | Reuses core operations |

All operations use the bundled Node entry point `assets/skills/_shared/references/openspec-cli.js`.

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
