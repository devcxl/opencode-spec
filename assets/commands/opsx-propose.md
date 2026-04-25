---
description: 快速创建 OpenSpec planning artifacts
agent: build
---

为变更 `$ARGUMENTS` 快速创建新的 OpenSpec change 与全部 planning artifacts。

执行：

```bash
node .opencode/skills/openspec-propose/references/new-change.js "$ARGUMENTS"
node .opencode/skills/openspec-propose/references/status.js "$ARGUMENTS"
```

然后：
1. 按 status 返回的依赖顺序逐个生成 artifact
2. 每个待生成 artifact 先执行 `node .opencode/skills/openspec-propose/references/instructions.js <artifact-id> --change="$ARGUMENTS"`
3. 阅读依赖文件后补全 `proposal.md`、`specs/*.md`、`design.md`、`tasks.md`
4. 保持 proposal / specs / design / tasks 一致
5. 对非 trivial 变更，不要跳过这些 planning artifacts 直接实现
