---
description: 归档 OpenSpec change
agent: build
---

归档 OpenSpec change `$ARGUMENTS`。

先确认：
1. `proposal.md`、`design.md`、`tasks.md`、`specs/` 已齐全
2. `tasks.md` 中无未完成任务
3. 实现已经过验证

然后执行：

```bash
node .opencode/skills/openspec-archive/references/archive.js --change="$ARGUMENTS"
```
