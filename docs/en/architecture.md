# Architecture

[Back to README](../../README.en.md) | [中文](../zh/architecture.md)

`opencode-spec` uses a "pure runtime injection" approach: commands and skills are registered at startup via OpenCode's `config` hook, with no files written to the project directory.

## Capability boundaries

The plugin directly handles:

- registering commands and skills at runtime
- injecting a session guidance message

Command execution, skill invocation, and reference script calls are all handled by OpenCode's native mechanisms. The plugin does not participate in runtime execution.

## Startup flow

The plugin completes injection through these steps:

### 1. Skill temp directory setup (`setupSkillsDir`)

```
assets/skills/                   /tmp/opencode-spec-skills-XXXX/skills/
├── openspec-propose/     →      ├── openspec-propose/
│   ├── SKILL.md                  │   ├── SKILL.md (paths replaced)
│   └── references/               │   └── references/
├── openspec-apply/        →      ├── openspec-apply/
├── openspec-archive/      →      ├── openspec-archive/
└── openspec-explore/      →      └── openspec-explore/
```

- Copies `assets/skills/` from the plugin package to a system temp directory (`/tmp/opencode-spec-skills-<random>/skills/`)
- Recursively walks all `SKILL.md` files, replacing `.opencode/skills/` path placeholders with actual temp directory paths
- Registers the temp directory via `config.skills.paths` as a skill search path
- Cleans up the temp directory automatically on process exit via `process.on("exit")`

### 2. Command registration (`loadCommands`)

```
assets/commands/            config.command
├── opsx-propose.md   →     /opsx-propose (template + description)
├── opsx-apply.md     →     /opsx-apply
├── opsx-archive.md   →     /opsx-archive
└── opsx-explore.md   →     /opsx-explore
```

- Parses frontmatter and template content from `assets/commands/*.md`
- Replaces `.opencode/skills/` paths in templates with temp skill directory paths
- Registers directly via `config.command`, making them available via `/`
- If a command with the same name already exists in `opencode.json`, the plugin will not override it

### 3. Guidance message injection (`experimental.chat.messages.transform`)

- Injects an OpenSpec workflow guidance block into the **first user message** of each session
- Content includes available slash commands and recommended workflow
- Injected only once per session, never duplicated

## Current limitation

`experimental.chat.messages.transform` is an experimental API and may change in the future.

If this API is removed, guidance message injection will be lost, but command and skill injection will not be affected (both use the `config` hook, which is a stable API).

## How reference scripts are invoked

SKILL.md files reference scripts using this pattern:

```
node .opencode/skills/openspec-propose/references/new-change.js "<name>"
```

`.opencode/skills/` is a path placeholder that is replaced at runtime with the actual temp directory path. Scripts are executed via `node` and operate on the `openspec/` directory structure.
