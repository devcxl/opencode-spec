---
slug: "extract-system-prompts-to-markdown"
createdAt: "2026-07-05T19:23:49.137Z"
---

# Proposal: extract-system-prompts-to-markdown

## Summary

将插件中硬编码在 TypeScript 里的系统提示词（bootstrap 消息）抽离为独立的 Markdown 文件，并建立统一的 prompt 加载机制（`assets/prompts/`），使得所有系统提示词都以 Markdown 文件形式存在，支持项目级覆盖。

## Motivation

当前插件有 4 类提示词，加载方式不统一：
- **bootstrap 消息**：硬编码在 `src/plugin/bootstrap.ts` 中，修改需重新编译
- **command 模板**：已从 `assets/commands/*.md` 加载
- **artifact 模板**：已从 `assets/templates/*.md` 加载
- **skill 指令**：已从 `assets/skills/*/SKILL.md` 加载

bootstrap 是唯一硬编码的提示词，不符合"提示词即 Markdown 文件"的统一模式。将其抽为外部文件后，用户无需重新编译即可修改，也为后续更多系统提示词的外部化奠定基础。

## Scope

- 新增 `assets/prompts/` 目录，放入 bootstrap 等系统提示词的 Markdown 文件
- 新增 `src/plugin/prompts.ts`，提供 `loadPrompt(name)` 加载函数，支持项目级覆盖（`.opencode/opencode-spec/prompts/<name>.md`）
- 改造 `src/plugin/bootstrap.ts` 改为通过 `loadPrompt` 加载
- 更新测试覆盖

## Non-Goals

- 不动已有的 commands / templates / skills 加载逻辑
- 不动已有的 skill reference JS 脚本
- 不做完整的 i18n 方案
- 不做运行时热重载

## Risks

- 若 `loadPrompt` 文件不存在，需要有合理的兜底机制

