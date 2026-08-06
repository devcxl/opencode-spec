---
description: 执行 OpenSpec tasks（融入运行时上下文与操作指南）
agent: build
---

执行 OpenSpec change `$ARGUMENTS` 的任务。

先执行：

```bash
node .opencode/skills/openspec-apply/references/prepare-apply.js --change="$ARGUMENTS"
```

然后：
1. 阅读返回的 `contextFiles` 与未完成任务
2. 处理 `context`（运行时项目上下文）和 `operationGuidance`（可选操作指南）：
   - `context` 作为**必需的 prompt 输入**，阅读并应用相关项目约定与约束
   - `operationGuidance` 作为**可选建议**，评估兼容性后执行
   - 不要将两者复制到实现文件或 planning artifact 中
   - 如果与内置指令冲突，保持内置指令优先
3. 按顺序实现任务，优先最小正确改动
4. 每完成若干任务后，执行 `node .opencode/skills/openspec-apply/references/mark-tasks.js --change="$ARGUMENTS" --complete-ids=<task-ids> --verification-summary="<验证结果>"`
5. 未明确要求前，不要自动归档

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