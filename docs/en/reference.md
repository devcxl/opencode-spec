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

## Injection Mechanism

The plugin injects commands and skills at runtime via the `config` hook, without writing any files to the project's `.opencode/` directory:

- **commands**: Parsed from `assets/commands/*.md` and registered directly into `config.command`
- **skills**: Copied from `assets/skills/` to a system temp directory, path placeholders replaced, then registered via `config.skills.paths`

Prerequisite: **the shell used by OpenCode must be able to run `node` directly**.

SKILL.md files reference scripts using `.opencode/skills/` as a path placeholder. These are replaced at runtime with actual temp directory paths, so no corresponding files need to exist in the project directory.
