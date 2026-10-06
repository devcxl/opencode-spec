<div align="center">

# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/build-verify.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/build-verify.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/create-release-tag.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/create-release-tag.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/npm-publish.yml)
[![npm version](https://img.shields.io/npm/v/@devcxl/opencode-spec)](https://www.npmjs.com/package/@devcxl/opencode-spec)
[![npm downloads](https://img.shields.io/npm/dm/@devcxl/opencode-spec)](https://www.npmjs.com/package/@devcxl/opencode-spec)

[中文](README.md) | English

`opencode-spec` is an OpenCode plugin that brings an OpenSpec-style spec-driven workflow into OpenCode.

</div>

## Core Capabilities

The plugin targets OpenCode V2 and registers these capabilities at runtime (no files are written to the project's `.opencode/` directory):

- **commands** (12): `/opsx-propose`, `/opsx-explore`, `/opsx-apply`, `/opsx-archive`, `/opsx-new-change`, `/opsx-continue-change`, `/opsx-ff-change`, `/opsx-update-change`, `/opsx-sync-specs`, `/opsx-verify-change`, `/opsx-bulk-archive`, `/opsx-onboard`
- **skills** (12): `openspec-propose`, `openspec-explore`, `openspec-apply`, `openspec-archive` plus 8 extension skills (new-change / continue-change / ff-change / update-change / verify-change / sync-specs / bulk-archive-change / onboard)

Each skill includes built-in JavaScript reference scripts, replacing external openspec CLI.

## Installation

OpenCode V2 is required. Add to `opencode.json` at the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@devcxl/opencode-spec"]
}
```

Prerequisite: **the shell used by OpenCode must be able to run `node` directly**.

## Configuration

By default, OpenSpec outputs to the `openspec/` directory under the project root. To customize, pass the `directory` option using the V2 plugin object format:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "@devcxl/opencode-spec", "options": { "directory": "docs" } }
  ]
}
```

You can also set the `OPENSPEC_DIR` environment variable, which takes priority over configuration.

## Workflow

```
propose → apply → archive
explore (optional, use anytime)
```

**Core commands**

| Command | Skill | Description |
|---------|-------|-------------|
| `/opsx-propose` | `openspec-propose` | Create change with proposal/specs/design/tasks |
| `/opsx-explore` | `openspec-explore` | Explore problems, clarify requirements |
| `/opsx-apply` | `openspec-apply` | Implement tasks |
| `/opsx-archive` | `openspec-archive` | Archive completed change |

**Extension commands**

| Command | Skill | Description |
|---------|-------|-------------|
| `/opsx-new-change` | `openspec-new-change` | Start a new change, step by step |
| `/opsx-continue-change` | `openspec-continue-change` | Continue to the next artifact |
| `/opsx-ff-change` | `openspec-ff-change` | Generate all planning artifacts quickly |
| `/opsx-update-change` | `openspec-update-change` | Revise planning artifacts coherently |
| `/opsx-sync-specs` | `openspec-sync-specs` | Sync delta specs to main specs |
| `/opsx-verify-change` | `openspec-verify-change` | Verify implementation matches artifacts |
| `/opsx-bulk-archive` | `openspec-bulk-archive-change` | Archive multiple changes at once |
| `/opsx-onboard` | `openspec-onboard` | Guided full workflow tutorial |

## How Injection Works

The plugin registers commands and skills at runtime through the OpenCode V2 plugin API:

- **commands**: Parsed from `assets/commands/` and registered at runtime — available via `/` without any file sync
- **skills**: Copied from `assets/skills/` to a system temp directory, path placeholders are replaced in SKILL.md, then registered at runtime; the plugin cleans up the directory when unloaded

## Local Development

```bash
npm install
npm test
npm run build
```

## Acknowledgements

The workflow design is inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## Documentation Index

- [`README.md`](README.md): default Chinese README
- [`README.zh.md`](README.zh.md): Chinese README
- [`docs/en/usage.md`](docs/en/usage.md): English usage guide
- [`docs/en/reference.md`](docs/en/reference.md): English reference
- [`docs/en/architecture.md`](docs/en/architecture.md): English architecture
- [`docs/zh/usage.md`](docs/zh/usage.md): Chinese usage guide
- [`docs/zh/reference.md`](docs/zh/reference.md): Chinese reference
- [`docs/zh/architecture.md`](docs/zh/architecture.md): Chinese architecture
