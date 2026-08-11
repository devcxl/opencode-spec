## Purpose
插件内置的 artifact 模板（proposal/design/spec/tasks）通过三级回退机制加载，确保用户项目能覆盖插件内置模板，而插件内置模板始终可被参考脚本使用，无需用户手动复制。

## ADDED Requirements

### Requirement: 模板三级回退加载

参考脚本的 `getTemplate()` 按顺序尝试以下来源，第一个存在的文件胜出：

1. 用户项目目录 `.opencode/opencode-spec/templates/<name>.md`
2. 插件内置模板目录（`setupSkillsDir` 复制的临时目录）
3. 硬编码的 `DEFAULT_TEMPLATES`

#### Scenario: 用户项目存在自定义模板
- **WHEN** 用户在 `.opencode/opencode-spec/templates/` 放置了自定义 `proposal.md`
- **THEN** `getTemplate("proposal")` 返回用户自定义内容

#### Scenario: 用户未自定义但插件内置模板可用
- **WHEN** 用户项目没有自定义模板，但插件已通过 `setupSkillsDir` 复制内置模板
- **THEN** `getTemplate("proposal")` 返回插件内置模板内容（新格式）

#### Scenario: 插件内置模板也不可用
- **WHEN** 插件内置模板目录缺失（如脚本被单独拷贝运行）
- **THEN** `getTemplate("proposal")` 回退到硬编码 `DEFAULT_TEMPLATES` 内容

### Requirement: 插件启动时复制内置模板

`setupSkillsDir()` 在复制 skills 到临时目录的同时，将 `assets/templates/` 复制到临时目录的 `templates/` 子目录，使参考脚本可通过相对路径访问内置模板。

#### Scenario: 插件启动复制模板
- **WHEN** 插件 config 钩子执行 `setupSkillsDir()`
- **THEN** 临时目录同时包含 `skills/` 与 `templates/`，`templates/` 内有 proposal.md、design.md、spec.md、tasks.md 四个文件

### Requirement: bootstrap 提示列出全部命令

`assets/prompts/bootstrap.md` 的 slash command 列表覆盖全部 12 个命令，按功能分类展示，控制注入长度。

#### Scenario: 会话注入 bootstrap
- **WHEN** 新会话首条用户消息被注入 bootstrap 内容
- **THEN** 列表中包含 `/opsx-propose`、`/opsx-explore`、`/opsx-apply`、`/opsx-archive` 以及 8 个扩展命令（new-change、continue-change、ff-change、update-change、verify-change、sync-specs、bulk-archive、onboard）

### Requirement: onboard 技能不依赖外部 CLI

`openspec-onboard` 技能的前置检查验证插件内置 JS 参考脚本存在，而非检查外部 `openspec` CLI。

#### Scenario: 检查内置脚本
- **WHEN** 用户运行 `/opsx-onboard`
- **THEN** 前置检查验证 `.opencode/skills/openspec-propose/references/new-change.js` 存在，不执行 `openspec --version`
