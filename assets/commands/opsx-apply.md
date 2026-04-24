---
description: 执行 OpenSpec tasks
agent: build
---

执行 OpenSpec change `$ARGUMENTS` 的任务。

先调用工具 `openspec-apply`：
- name: $ARGUMENTS

然后：
1. 阅读 `tasks.md` 中未完成的任务
2. 按顺序实现任务，优先最小正确改动
3. 每完成若干任务后，再次调用 `openspec-apply` 并传入 `completeTaskIds`
4. 将测试、构建、检查结果写入 `verificationSummary`
5. 未明确要求前，不要自动归档
