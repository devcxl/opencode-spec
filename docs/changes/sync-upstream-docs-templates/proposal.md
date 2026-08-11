---
slug: "sync-upstream-docs-templates"
createdAt: "2026-08-11T06:01:14.780Z"
---

## Why

项目刚完成上游 Fission-AI/OpenSpec 同步（技能 4 → 13，命令 4 → 12），但用户可见性与功能完整性存在多处断裂：

- **用户可见性断裂**：bootstrap.md、README 三语版、docs 文档仍只描述 4 命令 4 技能，用户无法发现 8 个新命令
- **模板部署链路断裂**：插件内置 `assets/templates/` 的新格式模板永远不会被部署到用户项目，`getTemplate()` 只读用户目录后回退到硬编码 `DEFAULT_TEMPLATES`
- **onboard 前置检查错误**：`openspec-onboard` 检查不存在的 `openspec` CLI，设计上本项目就是替代 CLI
- **目录配置逻辑混乱**：`server.ts` 依赖写 `process.env.OPENSPEC_DIR` 同步目录配置，存在重复代码

## What Changes

1. **bootstrap.md**：命令列表从 4 个更新为全部 12 个（分类展示，控制长度）
2. **README 三语版**（README.md / README.zh.md / README.en.md）：同步为 13 技能 12 命令
3. **docs/zh|en/usage.md**：同步技能与命令清单
4. **模板部署链路**：`setupSkillsDir` 同时复制 `assets/templates/` 到临时目录，`getTemplate()` 支持三级回退（用户目录 → 插件内置 → DEFAULT_TEMPLATES）
5. **openspec-onboard**：移除 `openspec --version` CLI 前置检查，改为验证内置 JS 脚本存在
6. **server.ts**：提取目录解析逻辑，消除重复代码与 env 副作用

## Capabilities

### New Capabilities

- `templates`: 模板三级回退加载机制（用户覆盖 → 插件内置 → 默认）

### Modified Capabilities

（无既有 capability 的 spec 级行为变更）

## Impact

- 修改文件：`assets/prompts/bootstrap.md`、`README.md`、`README.zh.md`、`README.en.md`、`docs/zh/usage.md`、`docs/en/usage.md`、`src/plugin/skills.ts`、`assets/skills/_shared/references/openspec.js`、`assets/skills/openspec-onboard/SKILL.md`、`src/plugin/server.ts`
- 新增测试：`test/reference-scripts.test.ts`（模板回退）、`test/plugin.test.ts`（skills 目录含 templates）
- 无新依赖，无 API 破坏

