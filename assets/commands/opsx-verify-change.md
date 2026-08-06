---
description: 验证实现与 artifact 是否匹配
agent: build
---

验证 OpenSpec change `$ARGUMENTS` 的实现是否与 artifact 匹配。

先执行：

```bash
node .opencode/skills/openspec-apply/references/prepare-apply.js --change="$ARGUMENTS"
```

然后从三个维度验证：
1. **完整性** — 任务完成度、spec 覆盖率
2. **正确性** — 需求实现、场景覆盖
3. **一致性** — 设计遵循、代码风格

输出 CRITICAL / WARNING / SUGGESTION 级别的问题报告。