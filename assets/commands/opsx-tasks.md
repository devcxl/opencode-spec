---
description: 更新 OpenSpec tasks
agent: build
---

为变更 `$ARGUMENTS` 生成或更新任务清单。

先调用工具 `openspec-tasks`：
- name: $ARGUMENTS

然后：
1. 阅读该 change 的 `proposal.md` 与 `design.md`
2. 将实现工作拆成可验证的任务项
3. 为每个高风险改动补上对应验证步骤
