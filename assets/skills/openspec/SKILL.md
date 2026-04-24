---
name: openspec
description: 使用 OpenSpec 驱动 proposal、design、tasks、apply、archive 的规格化开发流程
compatibility: opencode
---

# OpenSpec

当用户要求做中大型变更、跨文件改动、需要可审计需求链路，或明确要求规格驱动开发时，使用本技能。

## 工作流

1. Propose
2. Design
3. Tasks
4. Apply
5. Archive

## 工件职责

- `proposal.md`：说明改什么、为什么改、范围与风险
- `design.md`：说明技术方案、约束、取舍、影响范围
- `tasks.md`：说明可执行任务与验证步骤
- `specs/`：记录规格内容与验收标准

## 规则

- 对非 trivial 变更，不要跳过 proposal / design / tasks
- proposal、design、tasks、specs 必须保持一致
- 归档前必须完成实现与验证
- 如果 `tasks.md` 仍有未完成项，不应归档
- 复杂设计要先给出方案与取舍，再进入实现

## 推荐工具

- `openspec-init`
- `openspec-propose`
- `openspec-design`
- `openspec-tasks`
- `openspec-apply`
- `openspec-archive`
- `openspec-list`
