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

### 1. Register skills directly from the package

```text
<package>/assets/skills/                 OpenCode V2 Skill.Info
├── openspec-propose/SKILL.md     ───→  path points to the package file
│   └── references/                      script paths are rendered in memory
└── ...
```

- Reads skill files from the package's `assets/skills/`; it does not copy them to a temp or project directory
- Rewrites `.opencode/skills/` placeholders to package script paths in memory; source files remain unchanged
- Registers 12 built-in skills and 2 aliases (14 entries) through `ctx.skill.transform`
- Unloading requires no resource-copy cleanup
- Built-in templates are read from package `assets/templates/`, after project overrides and before the default fallback

### 2. Command registration (`loadCommands`)

```
assets/commands/            ctx.command.transform
├── opsx-propose.md   →     /opsx-propose (template + description)
├── opsx-apply.md     →     /opsx-apply
├── opsx-archive.md   →     /opsx-archive
└── opsx-explore.md   →     /opsx-explore
```

- Parses frontmatter and template content from `assets/commands/*.md`
- Replaces `.opencode/skills/` paths in templates with package script paths
- Registers 12 base commands and 6 aliases (18 entries) through `ctx.command.transform`
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
OPENSPEC_DIR='docs' node '<package-root>/assets/skills/openspec-propose/references/new-change.js' "<name>"
```

`.opencode/skills/` is a placeholder in skill content, replaced in memory with a quoted package script path during registration. `OPENSPEC_DIR` is set for each invocation, not written into the shared server environment; by default it is `openspec`.
