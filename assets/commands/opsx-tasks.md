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
3. 所有任务项必须严格使用 `- [ ] <任务ID> <描述>` 格式，其中任务 ID 只能是纯数字分段，如 `1.1`、`1.2`、`2.1.1`
4. 不允许使用前导零、`Step 1`、`1)`、`1-1`、括号编号等非机器可识别格式
5. 为每个高风险改动补上对应验证步骤
