---
description: 快速创建所有 planning artifacts
agent: build
---

快速创建 OpenSpec change `$ARGUMENTS` 的所有 planning artifacts。

执行：

```bash
node .opencode/skills/openspec-propose/references/new-change.js "$ARGUMENTS"
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后按依赖顺序创建所有 artifact（同 `/opsx-propose` 流程）。
完成后提示运行 `/opsx-apply` 开始实现。