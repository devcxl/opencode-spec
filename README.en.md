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

The plugin injects these capabilities at runtime via OpenCode's `config` hook (no files are written to the project's `.opencode/` directory):

- **commands**: `/opsx-propose`, `/opsx-explore`, `/opsx-apply`, `/opsx-archive`
- **skills**: `openspec-propose`, `openspec-explore`, `openspec-apply`, `openspec-archive`

Each skill includes built-in JavaScript reference scripts, replacing external openspec CLI.

## Installation

Add to `opencode.json` at project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

Prerequisite: **the shell used by OpenCode must be able to run `node` directly**.

## Configuration

By default, OpenSpec outputs to the `openspec/` directory under the project root. To customize, use the plugin tuple format to pass the `directory` option:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@devcxl/opencode-spec", { "directory": "docs" }]
  ]
}
```

You can also set the `OPENSPEC_DIR` environment variable, which takes priority over configuration.

## Workflow

```
propose → apply → archive
explore (optional, use anytime)
```

| Command | Skill | Description |
|---------|-------|-------------|
| `/opsx-propose` | `openspec-propose` | Create change with proposal/specs/design/tasks |
| `/opsx-explore` | `openspec-explore` | Explore problems, clarify requirements |
| `/opsx-apply` | `openspec-apply` | Implement tasks |
| `/opsx-archive` | `openspec-archive` | Archive completed change |

## How Injection Works

The plugin uses OpenCode's `config` hook to inject commands and skills at runtime:

- **commands**: Parsed from `assets/commands/` and registered directly via `config.command` — available via `/` without any file sync
- **skills**: Copied from `assets/skills/` to a system temp directory (`/tmp`), path placeholders are replaced in SKILL.md, then registered via `config.skills.paths`; temp directory is auto-cleaned on process exit

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
