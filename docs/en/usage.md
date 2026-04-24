# Usage Guide

[Back to README](../../README.en.md) | [中文](../zh/usage.md)

This document describes the recommended way to use `opencode-spec`, both for first-time setup and day-to-day workflow.

## 1. Install the plugin

Configure `opencode.json` in the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

After OpenCode starts, the plugin automatically syncs:

- `.opencode/commands/opsx-*.md`
- `.opencode/skills/openspec/SKILL.md`
- `.opencode/opencode-spec/templates/*.md`

If commands or skills are written for the first time, or upgraded, restarting OpenCode is recommended.

## 2. Initialize the workspace

When enabling OpenSpec in a project for the first time, use `openspec-init` to create the base directory and file structure.

## 3. Follow the workflow

Recommended order:

1. `propose`
2. `design`
3. `tasks`
4. `apply`
5. `archive`

### propose

Define the goal, scope, and expected value of the change.

### design

Document the implementation plan, constraints, alternatives, and key tradeoffs.

### tasks

Break the design down into executable, verifiable, and traceable tasks.

### apply

Update task state as implementation progresses.

### archive

Archive the change after implementation and verification are complete.

## 4. Choose tools or commands

### When tools are a better fit

- you want explicit parameter control
- you already know which OpenSpec step to invoke
- you prefer structured calls over conversational workflow prompts

### When commands are a better fit

- you want the agent to follow preset prompt guidance
- you want to reuse the repository's workflow templates
- you prefer a more conversational, prompt-driven style

## 5. Handle sync conflicts

If the plugin detects that a synced file was manually edited, it does not overwrite the file. Instead, it creates a sibling `.new` file.

Recommended handling:

1. compare the original file with the `.new` file
2. merge the content you want to keep
3. remove the `.new` file when it is no longer needed
4. restart OpenCode if commands or skills were updated

## 6. Practical suggestions

- treat `propose → design → tasks` as the standard preparation stage before implementation
- if you only change templates, focus on `.opencode/opencode-spec/templates`
- if you change commands or skills, restart OpenCode first and then verify behavior
