# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml)

中文 | [English](README.en.md)

`opencode-spec` 是一个 OpenCode 插件，用于把 OpenSpec 风格的规格驱动开发流程接入 OpenCode。

它同时提供两类能力：

1. **插件直接提供**：OpenSpec custom tools、启动时资源同步、会话提示
2. **通过文件发现接入**：commands、skills、templates 自动同步到项目 `.opencode/` 目录

## 使用指南

### 1. 安装插件

在项目根目录的 `opencode.json` 中加入：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

启动 OpenCode 后，插件会自动同步以下资源：

- `.opencode/commands/opsx-*.md`
- `.opencode/skills/openspec/SKILL.md`
- `.opencode/opencode-spec/templates/*.md`

如果 commands 或 skills 是首次写入，或被插件升级覆盖，建议重启 OpenCode，让原生发现机制重新扫描。

### 2. 初始化 OpenSpec 目录

首次接入时，先执行初始化工具或工作流命令，创建 OpenSpec 所需目录结构。

可用入口：

- tool：`openspec-init`
- command：按你的工作方式选择 `/opsx-propose` 等工作流命令

### 3. 按推荐流程推进变更

推荐工作流：

1. `propose`
2. `design`
3. `tasks`
4. `apply`
5. `archive`

建议这样理解：

- `propose`：定义要解决的问题、目标与范围
- `design`：补充实现方案、约束与取舍
- `tasks`：把方案拆成可执行任务
- `apply`：按任务推进实现并回写状态
- `archive`：在验证完成后归档这次变更

### 4. 选择使用入口

常用入口有两类：

- **tools**：`openspec-init`、`openspec-propose`、`openspec-design`、`openspec-tasks`、`openspec-apply`、`openspec-archive`、`openspec-list`
- **commands**：`/opsx-propose`、`/opsx-design`、`/opsx-tasks`、`/opsx-apply`、`/opsx-archive`、`/opsx-list`

如果你希望：

- **直接调用结构化工具**：优先用 tools
- **让 Agent 按预设提示组织流程**：优先用 commands

### 5. 理解资源同步行为

插件启动时会把内置资源同步到项目 `.opencode/` 目录。

同步规则如下：

- 目标文件不存在：直接写入
- 目标文件与插件版本一致：跳过
- 文件仅由插件升级引起变化：安全覆盖
- 文件被用户改过：不覆盖原文件，改为写入同名 `.new` 文件

如果出现 `.new` 文件，表示插件发现本地有人工修改，需要你手动合并。

详细使用示例见 [`docs/zh/usage.md`](docs/zh/usage.md)。

## 运行原理

这个插件的核心思路不是“把所有能力都动态注册进 OpenCode”，而是把 OpenSpec 工作流拆成两层：

- **tools 由插件直接提供**：负责创建、更新和归档 OpenSpec 变更
- **commands / skills / templates 由插件同步到项目目录**：再交给 OpenCode 原生发现机制接管

启动时插件会：

1. 扫描包内 `assets/commands`、`assets/skills`、`assets/templates`
2. 把资源同步到项目 `.opencode/` 目录
3. 写入 `.opencode/opencode-spec.manifest.json` 记录已同步文件与哈希
4. 如果发现用户改过已同步文件，不强制覆盖，而是写入对应 `.new` 文件供人工合并
5. 在会话创建时输出提示，告知是否发生同步、冲突以及是否建议重启

这意味着：

- **工具能力立即可用**
- **commands / skills 的新增或升级依赖 OpenCode 原生扫描**，所以部分场景需要重启

更详细的实现说明与限制见 [`docs/zh/architecture.md`](docs/zh/architecture.md)。

## 本地开发

### 安装依赖

```bash
npm install
```

### 常用命令

```bash
npm test
npm run typecheck
npm run build
```

其中：

- `npm test`：运行 Vitest
- `npm run typecheck`：执行 TypeScript 类型检查
- `npm run build`：编译到 `dist/`

## 致谢

本项目的工作流设计受到 OpenSpec 启发。感谢 OpenSpec 提供清晰的规格驱动开发思路，让 `opencode-spec` 可以把这套流程更自然地接入 OpenCode。

## 文档索引

- [`README.zh.md`](README.zh.md)：中文 README 版本
- [`README.en.md`](README.en.md)：English README
- [`docs/zh/usage.md`](docs/zh/usage.md)：中文使用指南
- [`docs/zh/reference.md`](docs/zh/reference.md)：中文参考文档
- [`docs/zh/architecture.md`](docs/zh/architecture.md)：中文实现原理
- [`docs/zh/release.md`](docs/zh/release.md)：中文发布文档
- [`docs/en/usage.md`](docs/en/usage.md)：English usage guide
- [`docs/en/reference.md`](docs/en/reference.md)：English reference
- [`docs/en/architecture.md`](docs/en/architecture.md)：English architecture
- [`docs/en/release.md`](docs/en/release.md)：English release guide
