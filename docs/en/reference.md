# Reference

[Back to README](../../README.en.md) | [中文](../zh/reference.md)

This document summarizes the tools, commands, and recommended workflow provided by `opencode-spec`.

## Tools

- `openspec-init`
- `openspec-propose`
- `openspec-design`
- `openspec-tasks`
- `openspec-apply`
- `openspec-archive`
- `openspec-list`

## Commands

- `/opsx-propose`
- `/opsx-design`
- `/opsx-tasks`
- `/opsx-apply`
- `/opsx-archive`
- `/opsx-list`

## Recommended workflow

Recommended order:

1. `propose`
2. `design`
3. `tasks`
4. `apply`
5. `archive`

Suggested interpretation:

- `propose`: define the change goal and scope
- `design`: document solution details and tradeoffs
- `tasks`: break the change into executable tasks
- `apply`: progress the tasks and update status
- `archive`: archive the change after verification completes

## Synced asset locations

After startup, the plugin syncs these resources:

- `assets/commands/*` → `.opencode/commands/*`
- `assets/skills/*` → `.opencode/skills/*`
- `assets/templates/*` → `.opencode/opencode-spec/templates/*`

If commands or skills are written for the first time, or upgraded, restarting OpenCode is recommended.
