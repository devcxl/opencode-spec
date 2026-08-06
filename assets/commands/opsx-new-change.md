---
description: 启动新变更，逐步创建 artifact
agent: build
---

启动新变更，使用逐步 artifact 创建方式。

先执行：

```bash
node .opencode/skills/openspec-propose/references/new-change.js "$ARGUMENTS"
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后：
1. 显示第一个可创建 artifact 的 instructions
2. **不要创建任何 artifact** — 等待用户指示
3. 提示用户："Ready to create the first artifact?"

**除非用户明确要求，否则不要进一步推进。**