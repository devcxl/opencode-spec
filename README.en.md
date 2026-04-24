# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml)

[中文](README.md) | English

`opencode-spec` is an OpenCode plugin that brings an OpenSpec-style spec-driven workflow into OpenCode.

It provides two layers of capability:

1. **Provided directly by the plugin**: OpenSpec custom tools, startup-time asset sync, and session notices
2. **Integrated through file discovery**: commands, skills, and templates are automatically synced into the project's `.opencode/` directory

## Usage Guide

### 1. Install the plugin

Add this to `opencode.json` at the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spec"]
}
```

After OpenCode starts, the plugin automatically syncs these assets:

- `.opencode/commands/opsx-*.md`
- `.opencode/skills/openspec/SKILL.md`
- `.opencode/opencode-spec/templates/*.md`

If commands or skills are written for the first time, or updated by a plugin upgrade, restarting OpenCode is recommended so native discovery can rescan them.

### 2. Initialize the OpenSpec workspace

When enabling OpenSpec for the first time, start by creating the required directory structure.

Available entry points:

- tool: `openspec-init`
- command: choose workflow commands such as `/opsx-propose` based on your preferred flow

### 3. Follow the recommended workflow

Recommended sequence:

1. `propose`
2. `design`
3. `tasks`
4. `apply`
5. `archive`

You can think of each step like this:

- `propose`: define the problem, goal, and scope
- `design`: document the solution, constraints, and tradeoffs
- `tasks`: break the work into executable tasks
- `apply`: implement the work and update task status
- `archive`: archive the change after verification is complete

### 4. Choose how to invoke it

There are two main entry styles:

- **tools**: `openspec-init`, `openspec-propose`, `openspec-design`, `openspec-tasks`, `openspec-apply`, `openspec-archive`, `openspec-list`
- **commands**: `/opsx-propose`, `/opsx-design`, `/opsx-tasks`, `/opsx-apply`, `/opsx-archive`, `/opsx-list`

Use:

- **tools** when you want direct structured tool calls
- **commands** when you want the agent to follow preset prompt-driven workflow guidance

### 5. Understand asset sync behavior

On startup, the plugin syncs bundled assets into the project's `.opencode/` directory.

The sync rules are:

- target file does not exist: write it directly
- target file already matches the plugin version: skip it
- file changed only because the plugin upgraded it: overwrite safely
- file was edited by the user: keep the original file and write a sibling `.new` file instead

If you see a `.new` file, it means the plugin detected local manual edits and expects a manual merge.

For step-by-step examples, see [`docs/en/usage.md`](docs/en/usage.md).

## How It Works

The core idea is not to dynamically register everything into OpenCode. Instead, the plugin splits the OpenSpec workflow into two layers:

- **tools are provided directly by the plugin**: they create, update, and archive OpenSpec changes
- **commands / skills / templates are synced into the project**: then OpenCode's native discovery picks them up

At startup the plugin:

1. scans `assets/commands`, `assets/skills`, and `assets/templates`
2. syncs them into the project's `.opencode/` directory
3. writes `.opencode/opencode-spec.manifest.json` to track synced files and hashes
4. writes a `.new` file instead of overwriting when it detects user-modified synced files
5. emits a session notice describing sync results, conflicts, and whether a restart is recommended

This means:

- **tool capabilities are available immediately**
- **new or upgraded commands / skills still depend on OpenCode native discovery**, so some cases require a restart

For more details and limitations, see [`docs/en/architecture.md`](docs/en/architecture.md).

## Local Development

### Install dependencies

```bash
npm install
```

### Common commands

```bash
npm test
npm run typecheck
npm run build
```

Where:

- `npm test`: runs Vitest
- `npm run typecheck`: runs TypeScript type checking
- `npm run build`: compiles to `dist/`

## Acknowledgements

The workflow design of this project is inspired by OpenSpec. Thanks to OpenSpec for providing a clear spec-driven development model that made it possible to bring this workflow into OpenCode more naturally through `opencode-spec`.

## Documentation Index

- [`README.md`](README.md): default Chinese README
- [`README.zh.md`](README.zh.md): Chinese README
- [`docs/en/usage.md`](docs/en/usage.md): English usage guide
- [`docs/en/reference.md`](docs/en/reference.md): English reference
- [`docs/en/architecture.md`](docs/en/architecture.md): English architecture
- [`docs/en/release.md`](docs/en/release.md): English release guide
- [`docs/zh/usage.md`](docs/zh/usage.md): Chinese usage guide
- [`docs/zh/reference.md`](docs/zh/reference.md): Chinese reference
- [`docs/zh/architecture.md`](docs/zh/architecture.md): Chinese architecture
- [`docs/zh/release.md`](docs/zh/release.md): Chinese release guide
