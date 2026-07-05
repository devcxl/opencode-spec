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

**遇到问题时暂停：**
- 任务不清晰 → 向用户确认
- 实现发现设计问题 → 建议更新 artifact
- 出现错误或阻塞 → 报告并等待指引

输出示例（暂停时）：

```
## Implementation Paused

**Change:** <change-name>
**Schema:** spec-driven
**Progress:** 4/7 tasks complete

### Issue Encountered
<描述问题>

**Options:**
1. <选项1>
2. <选项2>
3. 其他方案
```

输出示例（完成时）：

```
## Implementation Complete

**Change:** <change-name>
**Progress:** 7/7 tasks complete ✓

All tasks complete! Ready to archive this change.
```
