---
description: 执行 OpenSpec tasks
agent: build
---

执行 OpenSpec change `$ARGUMENTS` 的任务。

先执行：

```bash
node .opencode/skills/openspec-apply/references/prepare-apply.js --change="$ARGUMENTS"
```

然后：
1. 阅读返回的 `contextFiles` 与未完成任务
2. 按顺序实现任务，优先最小正确改动
3. 每完成若干任务后，执行 `node .opencode/skills/openspec-apply/references/mark-tasks.js --change="$ARGUMENTS" --complete-ids=<task-ids> --verification-summary="<验证结果>"`
4. 未明确要求前，不要自动归档
