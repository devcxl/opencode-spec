---
description: 快速创建所有 planning artifacts
---

快速创建 OpenSpec change `$ARGUMENTS` 的所有 planning artifacts。

执行：

```bash
node .opencode/skills/_shared/references/openspec-cli.js new-change "$ARGUMENTS"
node .opencode/skills/_shared/references/openspec-cli.js status "$ARGUMENTS"
```

然后按依赖顺序创建所有 artifact（同 `/opsx-propose` 流程）。
完成后提示运行 `/opsx-apply` 开始实现。
