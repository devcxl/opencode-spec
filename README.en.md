# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml)

[中文](README.md) | English

`opencode-spec` is an OpenCode plugin that brings an OpenSpec-style spec-driven workflow into OpenCode.

## Core Capabilities

The plugin syncs these resources to `.opencode/` directory:

- **commands**：`/opsx-propose`、`/opsx-explore`、`/opsx-apply`、`/opsx-archive`
- **skills**：`openspec-propose`、`openspec-explore`、`openspec-apply`、`openspec-archive`
- **templates**：proposal.md、design.md、spec.md、tasks.md

Each skill includes built-in JavaScript reference scripts, replacing external openspec CLI.

## Installation

Add to `opencode.json` at project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

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

## Asset Sync

On startup, the plugin syncs assets to `.opencode/` with these rules:

- target file does not exist: write directly
- target file matches plugin version: skip
- file changed due to plugin upgrade: overwrite safely
- file was edited by user: write `.new` file

If skills are written for the first time or upgraded, restarting OpenCode is recommended.

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
