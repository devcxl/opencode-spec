# Architecture

[Back to README](../../README.en.md) | [中文](../zh/architecture.md)

`opencode-spec` targets OpenCode V2. It registers commands and skills during plugin `setup(ctx)` without writing integration files into the project directory.

## Capability boundaries

The plugin directly handles:

- registering commands and skills at runtime
- injecting a session guidance message

OpenCode invokes the registered commands and skills. A command submits its rendered prompt through `ctx.session.prompt`; the agent runs the referenced Node scripts when needed. The plugin does not implement spec changes inside the OpenCode server.

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
- Rewrites script paths and passes the workspace-specific `OPENSPEC_DIR` to each script invocation
- Parses and registers the 12 skills through `ctx.skill.transform`
- Removes the temporary directory when the plugin unloads, including failed setup

### 2. Command registration (`loadCommands`)

```
assets/commands/            ctx.command.transform
├── opsx-propose.md   →     /opsx-propose (template + description)
├── opsx-apply.md     →     /opsx-apply
├── opsx-archive.md   →     /opsx-archive
└── opsx-explore.md   →     /opsx-explore
```

- Parses frontmatter and template content from `assets/commands/*.md`
- Replaces `.opencode/skills/` paths in templates with temp skill directory paths
- Registers all 12 commands through `ctx.command.transform`, making them available via `/`
- If a command with the same name already exists in `opencode.json`, the plugin will not override it

### 3. Guidance context (`ctx.session.hook("context")`)

- Adds an OpenSpec workflow guidance block to the model-visible system context
- Content includes available slash commands and recommended workflow
- Skips injection if the current context already contains the guidance marker

## Boundaries

The plugin uses its own bundled OpenSpec-style scripts, not the upstream `openspec` CLI. It does not provide all upstream CLI commands, schema types, or validation guarantees. Directory options must stay within the project; V1-only plugin entrypoints are not supported.

## How reference scripts are invoked

SKILL.md files reference scripts using this pattern:

```
OPENSPEC_DIR='docs' node '/tmp/opencode-spec-skills-XXXX/skills/openspec-propose/references/new-change.js' "<name>"
```

`.opencode/skills/` is a source placeholder replaced with a quoted temporary script path. `OPENSPEC_DIR` is set for each invocation, not written into the shared server environment; by default it is `openspec`.
