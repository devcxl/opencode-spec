# Design: extract-system-prompts-to-markdown

## Overview

将 bootstrap 消息从 TypeScript 硬编码抽离为 Markdown 文件，建立 `loadPrompt` 函数统一加载系统提示词，支持项目级覆盖。

## Goals

- bootstrap 消息可维护性提升：修改只需编辑 .md 文件，无需重新编译
- 模式统一：所有提示词都是从 Markdown 文件中加载
- 可覆盖：用户可在项目目录自定义任意系统提示词

## Constraints

- `getBootstrapContent()` 对外接口签名不能变，现有调用方不受影响
- 启动时加载，不做运行时热重载
- 加载失败时必须有兜底，不能导致插件崩溃

## Technical Approach

### 目录结构

```
assets/
└── prompts/
    └── bootstrap.md          # bootstrap 消息 Markdown 文件

# 项目覆盖路径（用户可选）：
# .opencode/opencode-spec/prompts/bootstrap.md
```

### `loadPrompt(name)` 实现

```typescript
async function loadPrompt(name: string): Promise<string> {
  // 1. 项目覆盖优先
  const projectPath = resolveProjectPromptPath(name)
  if (existsSync(projectPath)) return readFile(projectPath, "utf8")

  // 2. 插件内置
  const builtinPath = resolveBuiltinPromptPath(name)
  if (existsSync(builtinPath)) return readFile(builtinPath, "utf8")

  // 3. 兜底默认
  return getDefaultPrompt(name)
}
```

### `getDefaultPrompt` 兜底

保留原硬编码字符串作为兜底，确保文件缺失时不会报错。

### bootstrap.ts 改造

移除硬编码字符串，改为调用 `loadPrompt("bootstrap")`。

## Alternatives Considered

1. **YAML 配置文件**：比纯 Markdown 更结构化，但增加了 frontmatter 复杂度，且与现有 commands 风格不一致
2. **单一 prompts.json**：集中管理但不如 Markdown 文件直观，不利于版本对比
3. **仅从项目目录加载**：简化实现但失去了插件自包含性

## Impacted Files / Modules

| 文件 | 变更类型 |
|------|---------|
| `assets/prompts/bootstrap.md` | 新增 |
| `src/plugin/prompts.ts` | 新增 |
| `src/plugin/bootstrap.ts` | 改造 |
| `src/plugin/server.ts` | 传递 packageRoot 给 bootstrap |
| `src/index.ts` | 可能需导出新函数 |

## Risks and Mitigations

- **风险**：`loadPrompt` 文件读取失败 → 兜底返回内置字符串
- **风险**：项目覆盖文件路径错误 → 静默回退到内置版本
